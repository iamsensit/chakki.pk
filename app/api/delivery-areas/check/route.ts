import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
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

export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const body = await req.json()
		const { latitude, longitude, city } = body
		
		if (!latitude || !longitude) {
			return json(false, 'Latitude and longitude required', undefined, undefined, 400)
		}
		
		const lat = Number(latitude)
		const lon = Number(longitude)
		
		// Find delivery areas for the city (if provided) or all active areas
		const query: any = { isActive: true }
		if (city) {
			query.city = String(city).trim()
		}
		
		const areas = await DeliveryArea.find(query).lean()
		
		for (const area of areas) {
			const shopLat = Number((area as any).shopLocation?.latitude)
			const shopLon = Number((area as any).shopLocation?.longitude)
			const radius = Number((area as any).deliveryRadius) || 0
			
			// Primary check: Must have shop location and valid radius > 0
			if (shopLat && shopLon && !isNaN(shopLat) && !isNaN(shopLon) && radius > 0) {
				// Check if location is within the specific shop location's radius
				const distance = calculateDistance(lat, lon, shopLat, shopLon)
				if (distance <= radius) {
					return json(true, 'Delivery available', {
						available: true,
						city: (area as any).city,
						distance: Math.round(distance * 10) / 10,
						radius: radius,
						area: area
					})
				}
			}
			
			// Secondary check: Specific delivery areas (if any)
			const deliveryAreas = (area as any).deliveryAreas || []
			for (const deliveryArea of deliveryAreas) {
				const areaLat = Number(deliveryArea.latitude)
				const areaLon = Number(deliveryArea.longitude)
				const areaRadius = Number(deliveryArea.radius) || radius
				
				if (areaLat && areaLon && !isNaN(areaLat) && !isNaN(areaLon) && areaRadius > 0) {
					const distance = calculateDistance(lat, lon, areaLat, areaLon)
					if (distance <= areaRadius) {
						return json(true, 'Delivery available', {
							available: true,
							city: (area as any).city,
							distance: Math.round(distance * 10) / 10,
							radius: areaRadius,
							area: area,
							deliveryArea: deliveryArea
						})
					}
				}
			}
		}
		
		return json(true, 'Delivery not available', {
			available: false,
			message: 'Delivery is not available at this location'
		})
	} catch (err) {
		console.error('POST /api/delivery-areas/check error', err)
		return json(false, 'Failed to check delivery availability', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

