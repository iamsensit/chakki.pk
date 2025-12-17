// Google Maps API utilities
// Requires: Places API, Maps JavaScript API, Geocoding API

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

if (!API_KEY) {
	console.warn('Google Maps API key is not set. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file')
}

export interface GooglePlace {
	place_id: string
	description: string
	structured_formatting?: {
		main_text: string
		secondary_text: string
	}
}

export interface PlaceDetails {
	place_id: string
	name: string
	formatted_address: string
	geometry: {
		location: {
			lat: number
			lng: number
		}
		viewport?: {
			northeast: { lat: number; lng: number }
			southwest: { lat: number; lng: number }
		}
		bounds?: {
			northeast: { lat: number; lng: number }
			southwest: { lat: number; lng: number }
		}
	}
	address_components: Array<{
		long_name: string
		short_name: string
		types: string[]
	}>
	types: string[]
}

export interface SocietyData {
	name: string
	placeId: string
	address: string
	center: { lat: number; lng: number }
	bounds?: {
		northeast: { lat: number; lng: number }
		southwest: { lat: number; lng: number }
	}
	viewport?: {
		northeast: { lat: number; lng: number }
		southwest: { lat: number; lng: number }
	}
	city?: string
}

/**
 * Search for places using Google Places Autocomplete
 * @param query - Search query
 * @param city - Optional city to restrict search
 * @returns Array of place suggestions
 */
export async function searchPlaces(query: string, city?: string): Promise<GooglePlace[]> {
	if (!API_KEY) return []
	
	try {
		let searchQuery = query
		if (city) {
			searchQuery = `${query}, ${city}, Pakistan`
		} else {
			searchQuery = `${query}, Pakistan`
		}
		
		const response = await fetch(
			`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchQuery)}&key=${API_KEY}&components=country:pk`
		)
		
		if (!response.ok) return []
		
		const data = await response.json()
		if (data.status === 'OK' && Array.isArray(data.predictions)) {
			return data.predictions.map((pred: any) => ({
				place_id: pred.place_id,
				description: pred.description,
				structured_formatting: pred.structured_formatting
			}))
		}
		
		return []
	} catch (error) {
		console.error('Google Places Autocomplete error:', error)
		return []
	}
}

/**
 * Get detailed information about a place including boundaries
 * @param placeId - Google Place ID
 * @returns Place details with geometry and boundaries
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
	if (!API_KEY) return null
	
	try {
		const response = await fetch(
			`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=place_id,name,formatted_address,geometry,address_components,types&key=${API_KEY}`
		)
		
		if (!response.ok) return null
		
		const data = await response.json()
		if (data.status === 'OK' && data.result) {
			return data.result as PlaceDetails
		}
		
		return null
	} catch (error) {
		console.error('Google Place Details error:', error)
		return null
	}
}

/**
 * Extract society data from place details
 * @param placeDetails - Place details from Google API
 * @returns Society data with boundaries
 */
export function extractSocietyData(placeDetails: PlaceDetails): SocietyData {
	const city = placeDetails.address_components.find(
		comp => comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
	)?.long_name || ''
	
	// Handle Google Maps LatLng objects (which have .lat() and .lng() methods)
	const getLat = (location: any): number => {
		if (typeof location === 'object' && location !== null) {
			if (typeof location.lat === 'function') {
				return location.lat()
			}
			return location.lat || 0
		}
		return 0
	}
	
	const getLng = (location: any): number => {
		if (typeof location === 'object' && location !== null) {
			if (typeof location.lng === 'function') {
				return location.lng()
			}
			return location.lng || 0
		}
		return 0
	}
	
	// Extract center coordinates
	const centerLat = getLat(placeDetails.geometry.location)
	const centerLng = getLng(placeDetails.geometry.location)
	
	// Extract bounds if available
	let bounds = undefined
	if (placeDetails.geometry.bounds) {
		const neLat = getLat(placeDetails.geometry.bounds.northeast)
		const neLng = getLng(placeDetails.geometry.bounds.northeast)
		const swLat = getLat(placeDetails.geometry.bounds.southwest)
		const swLng = getLng(placeDetails.geometry.bounds.southwest)
		
		if (neLat && neLng && swLat && swLng) {
			bounds = {
				northeast: { lat: neLat, lng: neLng },
				southwest: { lat: swLat, lng: swLng }
			}
		}
	}
	
	// Extract viewport if available
	let viewport = undefined
	if (placeDetails.geometry.viewport) {
		const neLat = getLat(placeDetails.geometry.viewport.northeast)
		const neLng = getLng(placeDetails.geometry.viewport.northeast)
		const swLat = getLat(placeDetails.geometry.viewport.southwest)
		const swLng = getLng(placeDetails.geometry.viewport.southwest)
		
		if (neLat && neLng && swLat && swLng) {
			viewport = {
				northeast: { lat: neLat, lng: neLng },
				southwest: { lat: swLat, lng: swLng }
			}
		}
	}
	
	return {
		name: placeDetails.name,
		placeId: placeDetails.place_id,
		address: placeDetails.formatted_address,
		center: {
			lat: centerLat,
			lng: centerLng
		},
		bounds: bounds,
		viewport: viewport,
		city: city
	}
}

/**
 * Reverse geocode coordinates to address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Address information
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; city?: string } | null> {
	if (!API_KEY) {
		console.error('Google Maps API key is not set')
		return null
	}
	
	try {
		const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`
		const response = await fetch(url)
		
		if (!response.ok) {
			console.error('Reverse geocoding HTTP error:', response.status, response.statusText)
			return null
		}
		
		const data = await response.json()
		
		if (data.status !== 'OK') {
			console.error('Reverse geocoding API error:', data.status, data.error_message || '')
			return null
		}
		
		if (data.results && data.results.length > 0) {
			const result = data.results[0]
			const city = result.address_components.find(
				(comp: any) => comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
			)?.long_name || ''
			
			return {
				address: result.formatted_address,
				city: city
			}
		}
		
		console.warn('Reverse geocoding returned no results')
		return null
	} catch (error) {
		console.error('Google Reverse Geocoding error:', error)
		return null
	}
}

/**
 * Geocode an address to coordinates
 * @param address - Address string
 * @returns Coordinates and address details
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; address: string; city?: string } | null> {
	if (!API_KEY) return null
	
	try {
		const response = await fetch(
			`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`
		)
		
		if (!response.ok) return null
		
		const data = await response.json()
		if (data.status === 'OK' && data.results && data.results.length > 0) {
			const result = data.results[0]
			const city = result.address_components.find(
				(comp: any) => comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
			)?.long_name || ''
			
			return {
				lat: result.geometry.location.lat,
				lng: result.geometry.location.lng,
				address: result.formatted_address,
				city: city
			}
		}
		
		return null
	} catch (error) {
		console.error('Google Geocoding error:', error)
		return null
	}
}

