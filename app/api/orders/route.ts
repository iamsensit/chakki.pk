import { NextRequest, NextResponse } from 'next/server'
import { createOrderSchema } from '@/app/lib/validators'
import { getCodDeliveryFee, isFirstOrderCodFree } from '@/app/lib/price'
import { connectToDatabase } from '@/app/lib/mongodb'
import Cart from '@/models/Cart'
import Order from '@/models/Order'
import UserDeliveryLocation from '@/models/UserDeliveryLocation'
import DeliveryArea from '@/models/DeliveryArea'
import { auth } from '@/app/lib/auth'
import { isAdmin } from '@/app/lib/roles'
import { sendEmail } from '@/app/lib/email'
import { renderOrderEmailTemplate, enrichOrderItems } from '@/app/lib/email-templates'

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371 // Earth's radius in kilometers
	const dLat = (lat2 - lat1) * Math.PI / 180
	const dLon = (lon2 - lon1) * Math.PI / 180
	const a = 
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2)
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
	return R * c
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

const formatPKR = (amount: number) => `Rs ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		const userEmail = session?.user?.email
		if (!userEmail) return json(false, 'Login required for order placement', undefined, undefined, 401)
		const body = await req.json()
		const parsed = createOrderSchema.safeParse(body)
		if (!parsed.success) return json(false, 'Invalid body', undefined, parsed.error.flatten(), 400)

		const paymentReference = body.paymentReference || ''
		const paymentProofDataUrl = body.paymentProofDataUrl || ''
		if (parsed.data.paymentMethod === 'JAZZCASH') {
			console.log('JazzCash payload:', {
				ref: paymentReference,
				proofLen: paymentProofDataUrl ? paymentProofDataUrl.length : 0,
			})
		}

		const userId = userEmail
		
		// Get user's saved delivery location
		const userLocation = await UserDeliveryLocation.findOne({ userId }).lean()
		if (Array.isArray(userLocation)) return json(false, 'Invalid location data', undefined, undefined, 500)
		
		// Validate delivery location - always check if user has a saved location
		if (!userLocation) {
			return json(false, 'Please select a delivery location before placing an order. Click on the delivery location in the header to set your address.', undefined, { error: 'NO_LOCATION' }, 400)
		}
		
		const userLat = (userLocation as any).latitude
		const userLon = (userLocation as any).longitude
		const userCity = (userLocation as any).city
		
		// Validate coordinates are valid numbers
		if (!userLat || !userLon || isNaN(Number(userLat)) || isNaN(Number(userLon))) {
			return json(false, 'Invalid delivery location coordinates. Please update your delivery location.', undefined, { error: 'NO_LOCATION' }, 400)
		}
		
		// Use the saved location's city (from delivery area), not the form's city
		// The form city might be incorrect or manually edited
		const orderCity = userCity || parsed.data.city.trim()
		
		// Check if delivery is available at the saved location coordinates
		// Check ALL active delivery areas and validate by distance, not city name
		const areas = await DeliveryArea.find({ isActive: true }).lean()
		let isAvailable = false
		let closestDistance = Infinity
		let closestRadius = 0
		let shopLocationInfo = null
		
		console.log('[ORDER VALIDATION] User location:', { lat: userLat, lon: userLon, city: userCity, savedCity: userCity, formCity: parsed.data.city })
		console.log('[ORDER VALIDATION] Found', areas.length, 'active delivery areas (checking all by distance)')
		
		for (const area of areas) {
			const deliveryType = (area as any).deliveryType || 'range'
			const areaCity = (area as any).city
			
			// Check city-based delivery first
			if (deliveryType === 'city') {
				// For city-based delivery, check if the user's city matches
				if (areaCity.toLowerCase() === userCity.toLowerCase()) {
					isAvailable = true
					shopLocationInfo = { 
						lat: Number((area as any).shopLocation?.latitude) || 0, 
						lon: Number((area as any).shopLocation?.longitude) || 0, 
						radius: 0, 
						distance: 0 
					}
					console.log('[ORDER VALIDATION] City-based delivery matched:', areaCity)
					break
				}
				continue
			}
			
			// Range-based delivery validation
			const shopLat = Number((area as any).shopLocation?.latitude)
			const shopLon = Number((area as any).shopLocation?.longitude)
			const radius = Number((area as any).deliveryRadius) || 0
			
			console.log('[ORDER VALIDATION] Checking range-based area:', {
				city: areaCity,
				shopLat,
				shopLon,
				radius,
				hasShopLocation: !!(shopLat && shopLon),
				isValidRadius: radius > 0
			})
			
			// Primary check: Must have shop location and valid radius
			if (!isNaN(shopLat) && !isNaN(shopLon) && !isNaN(radius) && shopLat !== 0 && shopLon !== 0 && radius > 0) {
				const distance = calculateDistance(userLat, userLon, shopLat, shopLon)
				console.log('[ORDER VALIDATION] Distance calculation:', {
					userLocation: { lat: userLat, lon: userLon },
					shopLocation: { lat: shopLat, lon: shopLon },
					distance: Math.round(distance * 100) / 100, // More precise
					radius,
					withinRange: distance <= radius
				})
				
				// Allow same location (distance = 0) or within radius
				// Use strict comparison: distance must be <= radius
				if (distance <= radius) {
					isAvailable = true
					shopLocationInfo = { lat: shopLat, lon: shopLon, radius, distance }
					break
				}
				// Track closest distance for better error message
				if (distance < closestDistance) {
					closestDistance = distance
					closestRadius = radius
				}
			} else {
				console.log('[ORDER VALIDATION] Skipping area - invalid shop location or radius:', {
					shopLat,
					shopLon,
					radius,
					isNaNShopLat: isNaN(shopLat),
					isNaNShopLon: isNaN(shopLon),
					isNaNRadius: isNaN(radius)
				})
			}
			
			// Secondary check: Specific delivery areas (if any)
			const deliveryAreas = (area as any).deliveryAreas || []
			for (const deliveryArea of deliveryAreas) {
				const areaLat = Number(deliveryArea.latitude)
				const areaLon = Number(deliveryArea.longitude)
				const areaRadius = Number(deliveryArea.radius) || radius
				
				if (!isNaN(areaLat) && !isNaN(areaLon) && !isNaN(areaRadius) && areaLat !== 0 && areaLon !== 0 && areaRadius > 0) {
					const distance = calculateDistance(userLat, userLon, areaLat, areaLon)
					if (distance <= areaRadius) {
						isAvailable = true
						shopLocationInfo = { lat: areaLat, lon: areaLon, radius: areaRadius, distance }
						break
					}
					if (distance < closestDistance) {
						closestDistance = distance
						closestRadius = areaRadius
					}
				}
			}
			
			if (isAvailable) break
		}
		
		if (!isAvailable) {
			const distanceMsg = closestDistance < Infinity 
				? ` Your location is ${Math.round(closestDistance * 10) / 10}km away from the shop, but delivery is only available within ${closestRadius}km radius.`
				: ' No valid shop location found for this city.'
			console.log('[ORDER VALIDATION] Delivery NOT available:', { closestDistance, closestRadius })
			return json(false, `Delivery is not available at your saved location.${distanceMsg} Please update your delivery location to a valid area.`, undefined, { error: 'OUT_OF_RANGE', distance: closestDistance < Infinity ? Math.round(closestDistance * 10) / 10 : null, radius: closestRadius }, 400)
		}
		
		console.log('[ORDER VALIDATION] Delivery available:', shopLocationInfo)
		
		// Get cart items from database
		const cart = await Cart.findOne({ userId })
		if (!cart || cart.items.length === 0) return json(false, 'Cart is empty', undefined, undefined, 400)
		
		const orderItems = cart.items.map((i: any) => ({
			productId: i.productId,
			variantId: i.variantId,
			quantity: i.quantity,
			unitPrice: i.unitPrice,
		}))

		const previousCodOrders = await Order.countDocuments({ userId, paymentMethod: 'COD' })
		const isFirstCod = parsed.data.paymentMethod === 'COD' && isFirstOrderCodFree(previousCodOrders)
		
		// Calculate delivery fee based on delivery type
		let deliveryFee = 0
		if (parsed.data.paymentMethod === 'COD') {
			deliveryFee = getCodDeliveryFee(previousCodOrders)
		} else if (parsed.data.deliveryType === 'EXPRESS') {
			deliveryFee = 500
		} else {
			deliveryFee = 200 // STANDARD delivery
		}
		
		const totalAmount = orderItems.reduce((sum: number, i: any) => sum + i.unitPrice * i.quantity, 0) + deliveryFee

		const order = await Order.create({
			userId,
			status: 'PENDING',
			paymentMethod: parsed.data.paymentMethod,
			paymentStatus: 'PENDING',
			isFirstCodFree: isFirstCod,
			totalAmount,
			deliveryFee,
			deliveryType: parsed.data.deliveryType || 'STANDARD',
			shippingName: parsed.data.shippingName,
			shippingPhone: parsed.data.shippingPhone,
			shippingAddress: parsed.data.shippingAddress,
			city: parsed.data.city,
			paymentReference: parsed.data.paymentMethod === 'JAZZCASH' ? paymentReference : '',
			paymentProofDataUrl: parsed.data.paymentMethod === 'JAZZCASH' ? paymentProofDataUrl : '',
			jazzcashAccountName: parsed.data.jazzcashAccountName || '',
			jazzcashAccountNumber: parsed.data.jazzcashAccountNumber || '',
			easypaisaAccountName: parsed.data.easypaisaAccountName || '',
			easypaisaAccountNumber: parsed.data.easypaisaAccountNumber || '',
			items: orderItems
		})

		// Clear cart after order is created
		cart.items = []
		await cart.save()

		// Update product analytics (best-effort; don't block order creation if it fails)
		;(async () => {
			try {
				const { updateProductAnalyticsFromOrder } = await import('@/app/lib/productAnalytics')
				await updateProductAnalyticsFromOrder(orderItems)
			} catch (err) {
				console.error('Product analytics update failed', err)
			}
		})()

		// Send order confirmation email (best-effort; don't block order creation if it fails)
		;(async () => {
			try {
				const enrichedItems = await enrichOrderItems(order.items)
				const orderForEmail = {
					...order.toObject(),
					items: enrichedItems
				}
				const html = renderOrderEmailTemplate(
					orderForEmail,
					'Order Placed Successfully!',
					'Thank you for your order! We have received your order and will process it shortly. You will receive updates as your order is prepared and shipped.',
					'placed'
				)
				await sendEmail({
					to: userEmail,
					subject: `Order Confirmation - ${order._id}`,
					html
				})
			} catch (err) {
				console.error('Order confirmation email failed', err)
			}
		})()

		return json(true, 'Order created', { orderId: String(order._id) })
	} catch (err) {
		console.error('POST /api/orders error', err)
		return json(false, 'Failed to create order', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export async function GET(req: NextRequest) {
	try {
		await connectToDatabase()
		const url = new URL(req.url)
		const phone = url.searchParams.get('phone')
		
		// Import enrichOrderItems to add product names to order items
		const { enrichOrderItems } = await import('@/app/lib/email-templates')
		
		// If phone is provided, allow public access to search by phone
		if (phone) {
			const orders = await Order.find({ shippingPhone: phone.trim() }).sort({ createdAt: -1 }).lean()
			// Enrich order items with product names
			const enrichedOrders = await Promise.all(orders.map(async (order: any) => {
				const enrichedItems = await enrichOrderItems(order.items || [])
				return {
					...order,
					items: enrichedItems
				}
			}))
			return json(true, 'Orders fetched', enrichedOrders)
		}
		
		// Otherwise, require authentication
		const session = await auth()
		const userEmail = session?.user?.email
		if (!userEmail) return json(false, 'Authentication required', undefined, undefined, 401)
		const where: any = isAdmin(session) ? {} : { userId: userEmail }
		const orders = await Order.find(where).sort({ createdAt: -1 }).lean()
		// Enrich order items with product names
		const enrichedOrders = await Promise.all(orders.map(async (order: any) => {
			const enrichedItems = await enrichOrderItems(order.items || [])
			return {
				...order,
				items: enrichedItems
			}
		}))
		return json(true, 'Orders fetched', enrichedOrders)
	} catch (err) {
		console.error('GET /api/orders error', err)
		return json(false, 'Failed to fetch orders', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}
