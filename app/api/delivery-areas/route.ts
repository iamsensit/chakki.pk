import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import DeliveryArea from '@/models/DeliveryArea'
import { auth } from '@/app/lib/auth'
import { isAdminAsync } from '@/app/lib/roles'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET(req: NextRequest) {
	try {
		await connectToDatabase()
		const url = new URL(req.url)
		const activeOnly = url.searchParams.get('activeOnly') === 'true'
		
		const query: any = {}
		if (activeOnly) {
			query.isActive = true
		}
		
		const areas = await DeliveryArea.find(query).sort({ displayOrder: 1, city: 1 }).lean()
		return json(true, 'Delivery areas fetched', areas)
	} catch (err) {
		console.error('GET /api/delivery-areas error', err)
		return json(false, 'Failed to fetch delivery areas', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)
		
		// Check if admin
		if (!(await isAdminAsync(session))) return json(false, 'Admin access required', undefined, undefined, 403)
		
		const body = await req.json()
		const { city, shopLocation, deliveryRadius, deliveryType, deliveryAreas = [], isActive = true, displayOrder = 0, _id } = body
		
		// Validate required fields
		if (!city || !city.trim()) {
			return json(false, 'Missing required fields', undefined, { field: 'city' }, 400)
		}
		
		const deliveryTypeValue = deliveryType || 'city'
		
		// For range-based delivery, shop location and radius are required
		if (deliveryTypeValue === 'range') {
			if (!shopLocation || !shopLocation.latitude || !shopLocation.longitude) {
				return json(false, 'Missing required fields', undefined, { field: 'shopLocation (with latitude and longitude)' }, 400)
			}
			if (deliveryRadius === undefined || deliveryRadius === null || deliveryRadius <= 0) {
				return json(false, 'Missing required fields', undefined, { field: 'deliveryRadius (must be > 0 for range-based delivery)' }, 400)
			}
		}
		
		// For city-based delivery, at least one society is required
		if (deliveryTypeValue === 'city') {
			if (!Array.isArray(deliveryAreas) || deliveryAreas.length === 0) {
				return json(false, 'Please add at least one society', undefined, { field: 'deliveryAreas' }, 400)
			}
		}
		
		// Helper function to safely convert to number
		function safeNumber(value: any, defaultValue: number = 0): number {
			if (value === null || value === undefined || value === '') return defaultValue
			const num = Number(value)
			return isNaN(num) ? defaultValue : num
		}

		// For city-based delivery, use first society's coordinates or default
		let cityLat = 0
		let cityLng = 0
		if (deliveryTypeValue === 'city' && Array.isArray(deliveryAreas) && deliveryAreas.length > 0) {
			cityLat = safeNumber(deliveryAreas[0].latitude)
			cityLng = safeNumber(deliveryAreas[0].longitude)
		}

		const data: any = {
			deliveryType: deliveryTypeValue,
			city: String(city).trim(),
			shopLocation: deliveryTypeValue === 'range' ? {
				address: String(shopLocation.address || ''),
				latitude: safeNumber(shopLocation.latitude),
				longitude: safeNumber(shopLocation.longitude)
			} : {
				address: String(city).trim(), // Use city name as address for city-based delivery
				latitude: cityLat,
				longitude: cityLng
			},
			deliveryRadius: safeNumber(deliveryRadius, 0), // 0 for city-based, > 0 for range-based
			deliveryAreas: Array.isArray(deliveryAreas) ? deliveryAreas.map((area: any) => {
				const lat = safeNumber(area.latitude)
				const lng = safeNumber(area.longitude)
				
				// Validate that we have valid coordinates
				if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
					throw new Error(`Invalid coordinates for society "${area.name || 'Unknown'}". Please try selecting it again.`)
				}

				const boundsObj = area.bounds ? {
					northeast: {
						lat: safeNumber(area.bounds.northeast?.lat),
						lng: safeNumber(area.bounds.northeast?.lng)
					},
					southwest: {
						lat: safeNumber(area.bounds.southwest?.lat),
						lng: safeNumber(area.bounds.southwest?.lng)
					}
				} : undefined

				// Only include bounds if all values are valid
				const bounds = boundsObj && 
					!isNaN(boundsObj.northeast.lat) && !isNaN(boundsObj.northeast.lng) &&
					!isNaN(boundsObj.southwest.lat) && !isNaN(boundsObj.southwest.lng) &&
					boundsObj.northeast.lat !== 0 && boundsObj.northeast.lng !== 0 &&
					boundsObj.southwest.lat !== 0 && boundsObj.southwest.lng !== 0
					? boundsObj : undefined

				const viewportObj = area.viewport ? {
					northeast: {
						lat: safeNumber(area.viewport.northeast?.lat),
						lng: safeNumber(area.viewport.northeast?.lng)
					},
					southwest: {
						lat: safeNumber(area.viewport.southwest?.lat),
						lng: safeNumber(area.viewport.southwest?.lng)
					}
				} : undefined

				// Only include viewport if all values are valid
				const viewport = viewportObj && 
					!isNaN(viewportObj.northeast.lat) && !isNaN(viewportObj.northeast.lng) &&
					!isNaN(viewportObj.southwest.lat) && !isNaN(viewportObj.southwest.lng) &&
					viewportObj.northeast.lat !== 0 && viewportObj.northeast.lng !== 0 &&
					viewportObj.southwest.lat !== 0 && viewportObj.southwest.lng !== 0
					? viewportObj : undefined

				return {
					name: String(area.name || ''),
					placeId: area.placeId ? String(area.placeId) : undefined,
					address: area.address ? String(area.address) : undefined,
					latitude: lat,
					longitude: lng,
					radius: safeNumber(area.radius, 0),
					bounds: bounds,
					viewport: viewport
				}
			}) : [],
			isActive: !!isActive,
			displayOrder: safeNumber(displayOrder, 0)
		}
		
		let result
		if (_id) {
			result = await DeliveryArea.findByIdAndUpdate(_id, data, { new: true }).lean()
		} else {
			result = await DeliveryArea.create(data)
		}
		
		if (Array.isArray(result)) return json(false, 'Invalid result', undefined, undefined, 500)
		return json(true, _id ? 'Delivery area updated' : 'Delivery area created', result)
		} catch (err: any) {
			console.error('POST /api/delivery-areas error', err)
			const errorMessage = err.message || 'Failed to save delivery area'
			return json(false, errorMessage, undefined, { error: 'SERVER_ERROR', details: err.message }, 500)
		}
}

export async function DELETE(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)
		
		// Check if admin
		if (!(await isAdminAsync(session))) return json(false, 'Admin access required', undefined, undefined, 403)
		
		const url = new URL(req.url)
		const id = url.searchParams.get('id')
		if (!id) return json(false, 'ID required', undefined, undefined, 400)
		
		await DeliveryArea.findByIdAndDelete(id)
		return json(true, 'Delivery area deleted')
	} catch (err) {
		console.error('DELETE /api/delivery-areas error', err)
		return json(false, 'Failed to delete delivery area', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

