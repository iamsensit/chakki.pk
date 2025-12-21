import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

// Force dynamic rendering since this route uses request.url
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl
		const lat = searchParams.get('lat')
		const lng = searchParams.get('lng')
		
		if (!lat || !lng) {
			return NextResponse.json(
				{ success: false, message: 'Latitude and longitude are required' },
				{ status: 400 }
			)
		}
		
		if (!API_KEY) {
			return NextResponse.json(
				{ success: false, message: 'Google Maps API key is not configured' },
				{ status: 500 }
			)
		}
		
		const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`
		const response = await fetch(geocodeUrl)
		
		if (!response.ok) {
			return NextResponse.json(
				{ success: false, message: `HTTP error: ${response.status}` },
				{ status: response.status }
			)
		}
		
		const data = await response.json()
		
		if (data.status !== 'OK') {
			// Handle API key restriction errors gracefully
			if (data.status === 'REQUEST_DENIED' && data.error_message?.includes('referer')) {
				return NextResponse.json(
					{ 
						success: false, 
						message: 'API key has referer restrictions. Please use client-side geocoding.',
						status: data.status,
						useClientSide: true
					},
					{ status: 400 }
				)
			}
			
			return NextResponse.json(
				{ 
					success: false, 
					message: data.error_message || `Geocoding API error: ${data.status}`,
					status: data.status
				},
				{ status: 400 }
			)
		}
		
		if (data.results && data.results.length > 0) {
			const result = data.results[0]
			const city = result.address_components.find(
				(comp: any) => comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
			)?.long_name || ''
			
			return NextResponse.json({
				success: true,
				data: {
					address: result.formatted_address,
					city: city
				}
			})
		}
		
		return NextResponse.json(
			{ success: false, message: 'No results found' },
			{ status: 404 }
		)
	} catch (error: any) {
		console.error('Reverse geocoding API error:', error)
		return NextResponse.json(
			{ success: false, message: error.message || 'Internal server error' },
			{ status: 500 }
		)
	}
}

