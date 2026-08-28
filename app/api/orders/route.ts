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

		const userId = userEmail
		
		// Get user's saved delivery location or use Lahore default
		let userLocation = await UserDeliveryLocation.findOne({ userId }).lean()
		if (!userLocation || Array.isArray(userLocation)) {
			userLocation = {
				address: parsed.data.shippingAddress || 'Model Town, Lahore, Pakistan',
				city: parsed.data.city || 'Lahore',
				latitude: 31.4826,
				longitude: 74.3262
			} as any
		}
		
		const userLat = Number((userLocation as any).latitude) || 31.4826
		const userLon = Number((userLocation as any).longitude) || 74.3262
		const userCity = String((userLocation as any).city || 'Lahore').trim()
		
		const orderCity = userCity || parsed.data.city.trim() || 'Lahore'
		
		// Check if delivery is available at the location
		const areas = await DeliveryArea.find({ isActive: true }).lean()
		let isAvailable = areas.length === 0 // If no areas configured, allow all (Lahore default)
		let closestDistance = Infinity
		let closestRadius = 0
		let shopLocationInfo = null
		
		for (const area of areas) {
			const deliveryType = (area as any).deliveryType || 'range'
			const areaCity = String((area as any).city || '').trim()
			
			if (deliveryType === 'city') {
				if (areaCity.toLowerCase() === userCity.toLowerCase() || userCity.toLowerCase().includes('lahore')) {
					isAvailable = true
					shopLocationInfo = { 
						lat: Number((area as any).shopLocation?.latitude) || 0, 
						lon: Number((area as any).shopLocation?.longitude) || 0, 
						radius: 0, 
						distance: 0 
					}
					break
				}
				continue
			}
			
			// Range-based delivery validation
			const shopLat = Number((area as any).shopLocation?.latitude)
			const shopLon = Number((area as any).shopLocation?.longitude)
			const radius = Number((area as any).deliveryRadius) || 50
			
			if (!isNaN(shopLat) && !isNaN(shopLon) && radius > 0) {
				const distance = calculateDistance(userLat, userLon, shopLat, shopLon)
				if (distance < closestDistance) {
					closestDistance = distance
					closestRadius = radius
					shopLocationInfo = { lat: shopLat, lon: shopLon, radius, distance }
				}
				if (distance <= radius) {
					isAvailable = true
					break
				}
			}
		}

		// Fallback: If Lahore location, always allow delivery
		if (!isAvailable && (userCity.toLowerCase().includes('lahore') || areas.length === 0)) {
			isAvailable = true
		}

		if (!isAvailable) {
			const distanceMsg = closestDistance < Infinity 
				? ` Your location is ${Math.round(closestDistance * 10) / 10}km away from the shop, but delivery is only available within ${closestRadius}km radius.`
				: ' No valid shop location found for this city.'
			return json(false, `Delivery is not available at your saved location.${distanceMsg} Please update your delivery location to a valid area.`, undefined, { error: 'OUT_OF_RANGE', distance: closestDistance < Infinity ? Math.round(closestDistance * 10) / 10 : null, radius: closestRadius }, 400)
		}
		
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
