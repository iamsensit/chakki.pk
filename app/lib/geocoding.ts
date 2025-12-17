// Free geocoding using OpenStreetMap Nominatim API
// Rate limit: 1 request per second (free tier)

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number; display_name: string; city?: string } | null> {
	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
			{
				headers: {
					'User-Agent': 'Chakki-PK-Delivery-System' // Required by Nominatim
				}
			}
		)
		
		if (!response.ok) return null
		
		const data = await response.json()
		if (Array.isArray(data) && data.length > 0) {
			let city = ''
			if (data[0].address) {
				city = data[0].address.city || 
				       data[0].address.town || 
				       data[0].address.village || 
				       data[0].address.municipality ||
				       data[0].address.county ||
				       ''
			}
			
			return {
				lat: parseFloat(data[0].lat),
				lon: parseFloat(data[0].lon),
				display_name: data[0].display_name,
				city: city
			}
		}
		
		return null
	} catch (error) {
		console.error('Geocoding error:', error)
		return null
	}
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ address: string; display_name: string; city?: string } | null> {
	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
			{
				headers: {
					'User-Agent': 'Chakki-PK-Delivery-System'
				}
			}
		)
		
		if (!response.ok) return null
		
		const data = await response.json()
		if (data && data.display_name) {
			// Extract city from address components
			let city = ''
			if (data.address) {
				city = data.address.city || 
				       data.address.town || 
				       data.address.village || 
				       data.address.municipality ||
				       data.address.county ||
				       ''
			}
			
			return {
				address: data.display_name,
				display_name: data.display_name,
				city: city
			}
		}
		
		return null
	} catch (error) {
		console.error('Reverse geocoding error:', error)
		return null
	}
}

export async function searchLocalities(query: string, city?: string): Promise<Array<{ lat: number; lon: number; display_name: string; city?: string }>> {
	try {
		// Add Pakistan to search query to prioritize Pakistan results
		const searchQuery = city ? `${query}, ${city}, Pakistan` : `${query}, Pakistan`
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=15&addressdetails=1&countrycodes=pk`,
			{
				headers: {
					'User-Agent': 'Chakki-PK-Delivery-System'
				}
			}
		)
		
		if (!response.ok) return []
		
		const data = await response.json()
		if (Array.isArray(data)) {
			// Filter to only Pakistan results and extract city
			return data
				.filter((item: any) => {
					// Check if result is in Pakistan
					const country = item.address?.country || item.address?.country_code?.toLowerCase()
					return country === 'Pakistan' || country === 'pk' || item.display_name?.toLowerCase().includes('pakistan')
				})
				.map((item: any) => {
					let city = ''
					if (item.address) {
						city = item.address.city || 
						       item.address.town || 
						       item.address.village || 
						       item.address.municipality ||
						       item.address.county ||
						       ''
					}
					return {
						lat: parseFloat(item.lat),
						lon: parseFloat(item.lon),
						display_name: item.display_name,
						city: city
					}
				})
		}
		
		return []
	} catch (error) {
		console.error('Search localities error:', error)
		return []
	}
}

