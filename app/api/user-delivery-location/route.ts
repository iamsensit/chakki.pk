import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import UserDeliveryLocation from '@/models/UserDeliveryLocation'
import { auth } from '@/app/lib/auth'
import DeliveryArea from '@/models/DeliveryArea'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

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

export async function GET() {
	try {
		await connectToDatabase()
		const session = await auth()
		if (!session?.user?.email) return json(false, 'Unauthorized', undefined, undefined, 401)
		
		const location = await UserDeliveryLocation.findOne({ userId: session.user.email }).lean()
		if (Array.isArray(location)) return json(false, 'Invalid location data', undefined, undefined, 500)
		
		return json(true, 'Location fetched', location || null)
	} catch (err) {
		console.error('GET /api/user-delivery-location error', err)
		return json(false, 'Failed to fetch location', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		// Allow guest users - use temporary userId if not authenticated
		const userId = session?.user?.email || `guest_${Date.now()}`
		
		const body = await req.json()
		let { address, latitude, longitude, city, society, streetNumber, houseNumber, landmark } = body
		
		if (!address || !latitude || !longitude || !city) {
			return json(false, 'Missing required fields', undefined, { field: 'address, latitude, longitude, city' }, 400)
		}
		
		// Check if delivery is available at this location
		const lat = Number(latitude)
		const lon = Number(longitude)
		
		// Check ALL active delivery areas regardless of city name
		// This ensures we validate by distance or city name, depending on delivery type
		const areas = await DeliveryArea.find({ isActive: true }).lean()
		
		if (areas.length === 0) {
			return json(false, 'No delivery areas configured', undefined, { error: 'OUT_OF_RANGE' }, 400)
		}
		
		let deliveryAreaId = null
		let isAvailable = false
		let closestDistance = Infinity
		let closestRadius = 0
		
		console.log('[LOCATION SAVE] User location:', { lat, lon, city, userId: session?.user?.email ? 'authenticated' : 'guest' })
		console.log('[LOCATION SAVE] Found', areas.length, 'delivery areas')
		
		for (const area of areas) {
			const deliveryType = (area as any).deliveryType || 'range'
			const areaCity = (area as any).city
			
			// Check city-based delivery first
			if (deliveryType === 'city') {
				// For city-based delivery, check if the user's city matches
				if (areaCity.toLowerCase() === city.toLowerCase()) {
					// If society is provided, check if location is within society boundaries
					const deliveryAreas = (area as any).deliveryAreas || []
					if (society && deliveryAreas.length > 0) {
						const selectedSociety = deliveryAreas.find((s: any) => 
							s.name.toLowerCase() === society.toLowerCase()
						)
						
						if (selectedSociety && selectedSociety.bounds) {
							// Check if user location is within society bounds
							const bounds = selectedSociety.bounds
							const withinBounds = 
								lat >= bounds.southwest.lat && lat <= bounds.northeast.lat &&
								lon >= bounds.southwest.lng && lon <= bounds.northeast.lng
							
							if (!withinBounds) {
								console.log('[LOCATION SAVE] Location outside society bounds')
								continue
							}
							console.log('[LOCATION SAVE] Location within society bounds:', selectedSociety.name)
						}
					}
					
					isAvailable = true
					deliveryAreaId = (area as any)._id
					city = areaCity // Use the delivery area's city name
					console.log('[LOCATION SAVE] City-based delivery matched:', areaCity)
					break
				}
				continue
			}
			
			// Range-based delivery validation
			const shopLat = Number((area as any).shopLocation?.latitude)
			const shopLon = Number((area as any).shopLocation?.longitude)
			const radius = Number((area as any).deliveryRadius) || 0
			
			console.log('[LOCATION SAVE] Checking range-based area:', {
				city: areaCity,
				shopLat,
				shopLon,
				radius,
				hasShopLocation: !!(shopLat && shopLon),
				isValidRadius: radius > 0
			})
			
			// Primary check: Must have shop location and valid radius > 0
			if (!isNaN(shopLat) && !isNaN(shopLon) && !isNaN(radius) && shopLat !== 0 && shopLon !== 0 && radius > 0) {
				const distance = calculateDistance(lat, lon, shopLat, shopLon)
				console.log('[LOCATION SAVE] Distance calculation:', {
					userLocation: { lat, lon },
					shopLocation: { lat: shopLat, lon: shopLon },
					distance: Math.round(distance * 100) / 100,
					radius,
					withinRange: distance <= radius
				})
				
				if (distance <= radius) {
					isAvailable = true
					deliveryAreaId = (area as any)._id
					const matchedCity = areaCity
					console.log('[LOCATION SAVE] Location is within range!', {
						distance: Math.round(distance * 100) / 100,
						radius,
						deliveryAreaCity: matchedCity,
						providedCity: city
					})
					city = matchedCity || city
					break
				}
				// Track closest distance for better error message
				if (distance < closestDistance) {
					closestDistance = distance
					closestRadius = radius
				}
			} else {
				console.log('[LOCATION SAVE] Skipping area - invalid shop location or radius:', {
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
					const distance = calculateDistance(lat, lon, areaLat, areaLon)
					if (distance <= areaRadius) {
						isAvailable = true
						deliveryAreaId = (area as any)._id
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
				: ' Please ensure the shop location and delivery radius are properly configured in the admin panel.'
			console.log('[LOCATION SAVE] Delivery NOT available:', { 
				closestDistance: Math.round(closestDistance * 10) / 10, 
				closestRadius,
				userLocation: { lat, lon },
				checkedAreas: areas.length
			})
			return json(false, `Delivery is not available at this location.${distanceMsg}`, undefined, { error: 'OUT_OF_RANGE', distance: closestDistance < Infinity ? Math.round(closestDistance * 10) / 10 : null, radius: closestRadius }, 400)
		}
		
		// Get the matched delivery area's city
		const matchedArea = areas.find((a: any) => String(a._id) === String(deliveryAreaId))
		const finalCity = matchedArea ? (matchedArea as any).city : String(city).trim()
		
		console.log('[LOCATION SAVE] Location validated successfully!', {
			deliveryAreaCity: finalCity,
			deliveryAreaId,
			userId: session?.user?.email ? 'authenticated' : 'guest'
		})
		
		// For authenticated users, save to database
		if (session?.user?.email) {
			const location = await UserDeliveryLocation.findOneAndUpdate(
				{ userId: session.user.email },
				{
					userId: session.user.email,
					address: String(address).trim(),
					latitude: lat,
					longitude: lon,
					city: finalCity,
					society: society ? String(society).trim() : undefined,
					streetNumber: streetNumber ? String(streetNumber).trim() : undefined,
					houseNumber: houseNumber ? String(houseNumber).trim() : undefined,
					landmark: landmark ? String(landmark).trim() : undefined,
					deliveryAreaId
				},
				{ upsert: true, new: true }
			).lean()
			
			if (Array.isArray(location)) return json(false, 'Invalid location data', undefined, undefined, 500)
			
			return json(true, 'Location saved', location)
		} else {
			// For guest users, return the location data (will be saved to localStorage)
			return json(true, 'Location validated', {
				address: String(address).trim(),
				latitude: lat,
				longitude: lon,
				city: finalCity,
				society: society ? String(society).trim() : undefined,
				streetNumber: streetNumber ? String(streetNumber).trim() : undefined,
				houseNumber: houseNumber ? String(houseNumber).trim() : undefined,
				landmark: landmark ? String(landmark).trim() : undefined,
				deliveryAreaId,
				isGuest: true
			})
		}
	} catch (err) {
		console.error('POST /api/user-delivery-location error', err)
		return json(false, 'Failed to save location', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

