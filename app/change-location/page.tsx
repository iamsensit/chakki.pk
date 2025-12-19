"use client"

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { MapPin, Navigation, Check, X, Loader2 } from 'lucide-react'
import { reverseGeocode, searchPlaces, getPlaceDetails, extractSocietyData, type GooglePlace } from '@/app/lib/google-maps'
import { useErrorDialog } from '@/app/contexts/ErrorDialogContext'

interface DeliveryArea {
	_id: string
	city: string
	deliveryType?: 'range' | 'city'
	deliveryAreas: Array<{
		name: string
		placeId?: string
		latitude: number
		longitude: number
		radius?: number
		bounds?: {
			northeast: { lat: number; lng: number }
			southwest: { lat: number; lng: number }
		}
	}>
}

declare global {
	interface Window {
		google: any
	}
}

function ChangeLocationContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { data: session } = useSession()
	const redirectUrl = searchParams.get('redirect') || '/'
	const { showError } = useErrorDialog()
	
	const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([])
	const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
	const [userAddress, setUserAddress] = useState<string>('')
	const [userCity, setUserCity] = useState<string>('')
	const [selectedCity, setSelectedCity] = useState<string>('')
	const [selectedSociety, setSelectedSociety] = useState<string>('')
	const [streetNumber, setStreetNumber] = useState('')
	const [landmark, setLandmark] = useState('')
	const [houseNumber, setHouseNumber] = useState('')
	const [locationSelectionMode, setLocationSelectionMode] = useState<'auto' | 'search' | 'manual'>('auto')
	const [searchQuery, setSearchQuery] = useState('')
	const [searchSuggestions, setSearchSuggestions] = useState<Array<{ 
		place_id: string; 
		description: string;
		main_text?: string;
		secondary_text?: string;
	}>>([])
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [nearbySocieties, setNearbySocieties] = useState<Array<{ name: string; city: string; distance: number }>>([])
	const [locationValidationError, setLocationValidationError] = useState<string>('')
	const autocompleteServiceRef = useRef<any>(null)
	const placesServiceRef = useRef<any>(null)
	
	const [loadingLocation, setLoadingLocation] = useState(true)
	const [loadingAddress, setLoadingAddress] = useState(false)
	const [saving, setSaving] = useState(false)
	
	const mapRef = useRef<HTMLDivElement>(null)
	const mapInstanceRef = useRef<any>(null)
	const markerInstanceRef = useRef<any>(null)
	const [mapLoaded, setMapLoaded] = useState(false)
	const geolocationAttemptedRef = useRef(false)
	const [savedLocationData, setSavedLocationData] = useState<any>(null)
	const [showEditMode, setShowEditMode] = useState(false)

	// Load saved location on mount
	useEffect(() => {
		async function loadSavedLocation() {
			try {
				// First try to get from API if authenticated
				if (session?.user?.email) {
					const res = await fetch('/api/user-delivery-location', { cache: 'no-store' })
					const json = await res.json()
					if (json.success && json.data) {
						setSavedLocationData(json.data)
						// Pre-fill form with saved data
						if (json.data.latitude && json.data.longitude) {
							setUserLocation({ lat: json.data.latitude, lng: json.data.longitude })
							setUserAddress(json.data.address || '')
							setSelectedCity(json.data.city || '')
							setSelectedSociety(json.data.society || '')
							setStreetNumber(json.data.streetNumber || '')
							setHouseNumber(json.data.houseNumber || '')
							setLandmark(json.data.landmark || '')
							setUserCity(json.data.city || '')
							setLoadingLocation(false)
							return
						}
					}
				}
				
				// Fallback to localStorage
				const savedLocation = localStorage.getItem('deliveryLocation')
				if (savedLocation) {
					try {
						const location = JSON.parse(savedLocation)
						if (location.latitude && location.longitude) {
							setSavedLocationData(location)
							// Pre-fill form with saved data
							setUserLocation({ lat: location.latitude, lng: location.longitude })
							setUserAddress(location.address || '')
							setSelectedCity(location.city || '')
							setSelectedSociety(location.society || '')
							setStreetNumber(location.streetNumber || '')
							setHouseNumber(location.houseNumber || '')
							setLandmark(location.landmark || '')
							setUserCity(location.city || '')
							setLoadingLocation(false)
							return
						}
					} catch (e) {
						console.error('Error parsing saved location:', e)
					}
				}
				
				setLoadingLocation(false)
			} catch (err) {
				console.error('Error loading saved location:', err)
				setLoadingLocation(false)
			}
		}
		
		loadSavedLocation()
	}, [session?.user?.email])

	// Load delivery areas
	useEffect(() => {
		async function loadAreas() {
			try {
				const res = await fetch('/api/delivery-areas?activeOnly=true', { 
					cache: 'no-store',
					headers: {
						'Content-Type': 'application/json'
					}
				})
				
				if (!res.ok) {
					console.error('Delivery areas API error:', res.status, res.statusText)
					// Only show error for server errors (500), not for client errors or empty results
					if (res.status >= 500) {
						showError(`Server error (${res.status}). Please check if the server is running and try again.`, 'Loading Error')
					}
					// For other errors, just set empty array and continue
					setDeliveryAreas([])
					return
				}
				
				const json = await res.json()
				console.log('Delivery areas API response:', json)
				
				if (json.success && Array.isArray(json.data)) {
					setDeliveryAreas(json.data)
					console.log('Loaded delivery areas:', json.data.length)
				} else {
					console.warn('No delivery areas found or invalid response:', json)
					// Set empty array - this is normal if no areas are configured yet
					setDeliveryAreas([])
					// Don't show error - admin needs to add delivery areas first
				}
			} catch (err: any) {
				console.error('Failed to load delivery areas:', err)
				// Only show error for network errors, not JSON parse errors
				if (err.name === 'TypeError' && err.message.includes('fetch')) {
					showError('Network error. Please check your internet connection and try again.', 'Connection Error')
				} else if (!err.message || !err.message.includes('JSON')) {
					// Only show for non-JSON errors
					console.error('Non-network error:', err)
				}
				// Set empty array to allow page to continue
				setDeliveryAreas([])
			}
		}
		loadAreas()
		loadGoogleMaps()
	}, [showError])

	// Load Google Maps
	function loadGoogleMaps() {
		if (typeof window === 'undefined') return
		
		// If Google Maps is already loaded, initialize services
		if (window.google && window.google.maps && window.google.maps.places) {
			try {
				if (!autocompleteServiceRef.current) {
					autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
					console.log('✅ AutocompleteService initialized (already loaded)')
				}
				if (!placesServiceRef.current) {
					placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement('div'))
					console.log('✅ PlacesService initialized (already loaded)')
				}
				setMapLoaded(true)
			} catch (error) {
				console.error('Failed to initialize Places services:', error)
				setMapLoaded(true)
			}
			return
		}
		
		// Get API key from environment variable
		const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
		if (!apiKey) {
			console.error('Google Maps API key is not set. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file')
			showError('Google Maps API key is missing. Please configure it in .env.local', 'Configuration Error')
			setMapLoaded(true) // Set to true anyway so the page doesn't hang
			return
		}
		
		const script = document.createElement('script')
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
		script.async = true
		script.defer = true
		script.onload = () => {
			// Initialize Places services when Google Maps loads
			setTimeout(() => {
				if (window.google && window.google.maps && window.google.maps.places) {
					try {
						if (!autocompleteServiceRef.current) {
							autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
							console.log('✅ AutocompleteService initialized')
						}
						if (!placesServiceRef.current) {
							placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement('div'))
							console.log('✅ PlacesService initialized')
						}
					} catch (error) {
						console.error('Failed to initialize Places services:', error)
					}
				}
				setMapLoaded(true)
			}, 100)
		}
		script.onerror = () => {
			console.error('Failed to load Google Maps script')
			showError('Failed to load Google Maps. Please check your API key.', 'Map Loading Error')
			setMapLoaded(true)
		}
		document.head.appendChild(script)
	}

	// Get user's precise location
	useEffect(() => {
		// Prevent multiple geolocation attempts
		if (geolocationAttemptedRef.current) return
		geolocationAttemptedRef.current = true
		
		if (!navigator.geolocation) {
			showError('Geolocation is not supported by your browser. Please select your location manually.', 'Location Not Supported')
			setLoadingLocation(false)
			return
		}

		setLoadingLocation(true)
		console.log('Requesting geolocation...')
		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const lat = position.coords.latitude
				const lng = position.coords.longitude
				
				console.log('✅ Geolocation success:', lat, lng, 'Accuracy:', position.coords.accuracy, 'm')
				
				// Validate coordinates are reasonable (Pakistan bounds)
				if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
					console.error('Invalid coordinates received:', lat, lng)
					showError('Invalid location received. Please try again or select manually.', 'Invalid Location')
					setLoadingLocation(false)
					return
				}
				
				// Validate coordinates are within reasonable bounds (Pakistan)
				if (lat < 23.6 || lat > 37.0 || lng < 60.8 || lng > 77.8) {
					console.warn('Location outside Pakistan bounds:', lat, lng)
					showError('Location detected is outside Pakistan. Please ensure you are in Pakistan or select your location manually.', 'Location Out of Range')
					setLoadingLocation(false)
					return
				}
				
				setUserLocation({ lat, lng })
				setLoadingLocation(false)
				// Address will be geocoded once map is loaded (see useEffect below)
			},
			(error) => {
				console.error('❌ Geolocation error:', error.code, error.message)
				// Don't show random location - just show error and let user select manually
				setUserLocation(null)
				setLoadingLocation(false)
				
				// Show appropriate error message (only once)
				if (error.code === error.PERMISSION_DENIED) {
					showError('Location access was denied. Please allow location access in your browser settings or select your location manually.', 'Location Access Denied')
				} else if (error.code === error.POSITION_UNAVAILABLE) {
					showError('Your location is unavailable. Please select your location manually using the map below.', 'Location Unavailable')
				} else if (error.code === error.TIMEOUT) {
					showError('Location request timed out. Please try again or select your location manually.', 'Request Timeout')
				} else {
					showError('Failed to get your location. Please select your location manually using the map below.', 'Location Error')
				}
			},
			{
				enableHighAccuracy: true,
				timeout: 15000,
				maximumAge: 0
			}
		)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Initialize Places services when map is loaded
	useEffect(() => {
		if (mapLoaded && window.google && window.google.maps && window.google.maps.places) {
			try {
				if (!autocompleteServiceRef.current) {
					autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
					console.log('✅ AutocompleteService initialized when map loaded')
				}
				if (!placesServiceRef.current) {
					placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement('div'))
					console.log('✅ PlacesService initialized when map loaded')
				}
			} catch (error) {
				console.error('Failed to initialize Places services:', error)
			}
		}
	}, [mapLoaded])

	// Initialize map when Google Maps is loaded
	useEffect(() => {
		if (mapLoaded && mapRef.current && window.google && !mapInstanceRef.current) {
			initMap()
		} else if (userLocation && mapInstanceRef.current && mapInstanceRef.current.setCenter) {
			// Update map center if location changes after map is initialized
			console.log('Updating map center to:', userLocation)
			mapInstanceRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng })
			if (markerInstanceRef.current) {
				markerInstanceRef.current.setPosition({ lat: userLocation.lat, lng: userLocation.lng })
			}
		}
	}, [userLocation, mapLoaded])
	
	// Try geocoding once map is loaded
	useEffect(() => {
		if (userLocation && mapLoaded && window.google && window.google.maps && !userAddress) {
			// Map is loaded, try geocoding now
			const tryGeocode = async () => {
				setLoadingAddress(true)
				try {
					// First, check if location is within any society's bounds or radius
					const validationResult = checkLocationInSocieties(userLocation.lat, userLocation.lng)
					if (validationResult.city && validationResult.society) {
						console.log('Initial location matched society:', validationResult)
						// Auto-fill city and society
						setSelectedCity(validationResult.city)
						setSelectedSociety(validationResult.society)
					} else {
						// Location not in any society
						setSelectedCity('')
						setSelectedSociety('')
						if (validationResult.nearby && validationResult.nearby.length > 0) {
							setNearbySocieties(validationResult.nearby)
							setLocationValidationError(`Your location is not within any delivery area. Nearby delivery areas:`)
						} else {
							setLocationValidationError('Your location is not within any delivery area. Please select a location within our delivery zones.')
						}
					}
					
					console.log('Attempting reverse geocode with JavaScript API for:', userLocation.lat, userLocation.lng)
					const geocoder = new window.google.maps.Geocoder()
					
					const addressData = await new Promise<{ address: string; city?: string } | null>((resolve) => {
						geocoder.geocode({ location: { lat: userLocation.lat, lng: userLocation.lng } }, (results: any, status: any) => {
							console.log('Geocoder response:', status, results?.length || 0, 'results')
							if (status === 'OK' && results && results.length > 0) {
								const result = results[0]
								const city = result.address_components.find(
									(comp: any) => comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
								)?.long_name || ''
								
								resolve({
									address: result.formatted_address,
									city: city
								})
							} else {
								console.warn('Geocoder status:', status)
								resolve(null)
							}
						})
					})
					
					if (addressData) {
						setUserAddress(addressData.address)
						// Only set city if not already matched from society
						const validationResult = checkLocationInSocieties(userLocation.lat, userLocation.lng)
						if (!validationResult.city) {
							setUserCity(addressData.city || '')
						}
						
						// Check if location is in Pakistan
						if (userLocation.lat < 23.6 || userLocation.lat > 37.0 || userLocation.lng < 60.8 || userLocation.lng > 77.8) {
							showError('Please ensure you are in Pakistan', 'Location Out of Range')
						}
					} else {
						// Fallback: Try server-side API
						try {
							const apiRes = await fetch(`/api/geocode/reverse?lat=${userLocation.lat}&lng=${userLocation.lng}`)
							const apiJson = await apiRes.json()
							if (apiJson.success && apiJson.data) {
								setUserAddress(apiJson.data.address)
								const validationResult = checkLocationInSocieties(userLocation.lat, userLocation.lng)
								if (!validationResult.city) {
									setUserCity(apiJson.data.city || '')
								}
							} else {
								// Last resort: show coordinates
								setUserAddress(`Location: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`)
							}
						} catch (apiErr) {
							console.warn('Server-side geocoding failed:', apiErr)
							setUserAddress(`Location: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`)
						}
					}
				} catch (err) {
					console.error('Geocoding error:', err)
					setUserAddress(`Location: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`)
				} finally {
					setLoadingAddress(false)
				}
			}
			
			// Small delay to ensure map is fully initialized
			setTimeout(tryGeocode, 500)
		}
	}, [userLocation, mapLoaded, userAddress, deliveryAreas])

	// Function to calculate distance between two coordinates (Haversine formula)
	function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6371 // Earth's radius in km
		const dLat = (lat2 - lat1) * Math.PI / 180
		const dLon = (lon2 - lon1) * Math.PI / 180
		const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
			Math.sin(dLon / 2) * Math.sin(dLon / 2)
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
		return R * c
	}
	
	// Function to check if location is within a society's bounds or radius
	// Helper function that accepts delivery areas as parameter (for use in closures)
	function checkLocationInSocietiesWithData(lat: number, lng: number, areas: DeliveryArea[]) {
		const nearby: Array<{ name: string; city: string; distance: number }> = []
		
		console.log('🔍 Checking location in societies:', { lat, lng, areasCount: areas.length })
		console.log('📦 Delivery areas:', areas)
		
		for (const area of areas) {
			console.log(`📍 Checking area: ${area.city}, type: ${area.deliveryType}, societies: ${area.deliveryAreas?.length || 0}`)
			
			if (area.deliveryType === 'city' && area.deliveryAreas && area.deliveryAreas.length > 0) {
				for (const society of area.deliveryAreas) {
					console.log(`  🏘️ Checking society: ${society.name}`, {
						hasBounds: !!society.bounds,
						hasRadius: !!society.radius,
						hasCoords: !!(society.latitude && society.longitude),
						coords: { lat: society.latitude, lng: society.longitude }
					})
					
					// First check if within bounds (most accurate)
					if (society.bounds && society.bounds.southwest && society.bounds.northeast) {
						const bounds = society.bounds
						const swLat = Number(bounds.southwest.lat)
						const swLng = Number(bounds.southwest.lng)
						const neLat = Number(bounds.northeast.lat)
						const neLng = Number(bounds.northeast.lng)
						
						// Validate bounds are valid numbers
						if (!isNaN(swLat) && !isNaN(swLng) && !isNaN(neLat) && !isNaN(neLng)) {
							const withinBounds = 
								lat >= swLat && lat <= neLat &&
								lng >= swLng && lng <= neLng
							
							console.log(`    Bounds check:`, {
								bounds: { sw: { lat: swLat, lng: swLng }, ne: { lat: neLat, lng: neLng } },
								userLocation: { lat, lng },
								withinBounds,
								latCheck: `${lat} >= ${swLat} && ${lat} <= ${neLat} = ${lat >= swLat && lat <= neLat}`,
								lngCheck: `${lng} >= ${swLng} && ${lng} <= ${neLng} = ${lng >= swLng && lng <= neLng}`
							})
							
							if (withinBounds) {
								console.log(`✅ MATCHED by bounds: ${society.name} in ${area.city}`)
								return {
									city: area.city,
									society: society.name,
									nearby: []
								}
							}
						} else {
							console.log(`    ⚠️ Invalid bounds data:`, bounds)
						}
					}
					
					// If bounds check failed, check radius
					const socLat = Number(society.latitude)
					const socLng = Number(society.longitude)
					
					if (!isNaN(socLat) && !isNaN(socLng)) {
						const distance = calculateDistance(lat, lng, socLat, socLng)
						
						if (society.radius && Number(society.radius) > 0) {
							const radius = Number(society.radius)
							console.log(`    Radius check: distance=${distance.toFixed(2)}km, radius=${radius}km`)
							if (distance <= radius) {
								console.log(`✅ MATCHED by radius: ${society.name} in ${area.city}`)
								return {
									city: area.city,
									society: society.name,
									nearby: []
								}
							} else {
								// Track nearby societies (within 10km for better suggestions)
								if (distance <= 10) {
									nearby.push({
										name: society.name,
										city: area.city,
										distance: Math.round(distance * 100) / 100
									})
								}
							}
						} else {
							// If no radius but has coordinates, calculate distance to center
							console.log(`    Default radius check: distance=${distance.toFixed(2)}km (using 2km default)`)
							// Use a default radius of 2km if no radius is defined
							if (distance <= 2) {
								console.log(`✅ MATCHED by default radius: ${society.name} in ${area.city}`)
								return {
									city: area.city,
									society: society.name,
									nearby: []
								}
							} else if (distance <= 10) {
								nearby.push({
									name: society.name,
									city: area.city,
									distance: Math.round(distance * 100) / 100
								})
							}
						}
					} else {
						console.log(`    ⚠️ Society has invalid coordinates: lat=${society.latitude}, lng=${society.longitude}`)
					}
				}
			} else {
				console.log(`  ⚠️ Area ${area.city} is not city type or has no societies`)
			}
		}
		
		// Sort nearby by distance
		nearby.sort((a, b) => a.distance - b.distance)
		
		console.log('❌ No match found. Nearby:', nearby)
		
		return {
			city: null,
			society: null,
			nearby: nearby.slice(0, 5) // Top 5 nearest
		}
	}
	
	// Main function that uses current state
	function checkLocationInSocieties(lat: number, lng: number) {
		return checkLocationInSocietiesWithData(lat, lng, deliveryAreas)
	}
	
	// Handle search input for location
	useEffect(() => {
		const query = searchQuery.trim()
		if (!query || query.length < 2) {
			setSearchSuggestions([])
			setShowSuggestions(false)
			return
		}
		
		// Ensure Google Maps is loaded
		if (!window.google || !window.google.maps || !window.google.maps.places) {
			console.warn('⚠️ Google Maps Places API not ready yet, will retry...')
			// Retry after a short delay
			const retryTimeout = setTimeout(() => {
				if (window.google && window.google.maps && window.google.maps.places) {
					// Re-trigger the effect by updating searchQuery (but this might cause infinite loop)
					// Instead, just try to initialize
					if (!autocompleteServiceRef.current) {
						try {
							autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
							console.log('✅ AutocompleteService initialized on retry')
						} catch (error) {
							console.error('Failed to initialize:', error)
						}
					}
				}
			}, 500)
			return () => clearTimeout(retryTimeout)
		}
		
		// Initialize autocomplete service if needed
		if (!autocompleteServiceRef.current) {
			try {
				autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
				console.log('✅ AutocompleteService initialized in search effect')
			} catch (error) {
				console.error('❌ Failed to initialize AutocompleteService:', error)
				return
			}
		}
		
		console.log('🔍 Triggering search for:', query, {
			hasService: !!autocompleteServiceRef.current,
			hasGoogle: !!window.google,
			hasPlaces: !!(window.google?.maps?.places)
		})
		
		const timeout = setTimeout(() => {
			if (!autocompleteServiceRef.current) {
				console.error('❌ AutocompleteService not available after timeout')
				// Try one more time to initialize
				if (window.google && window.google.maps && window.google.maps.places) {
					try {
						autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
						console.log('✅ AutocompleteService initialized in timeout')
					} catch (error) {
						console.error('Failed to initialize:', error)
						return
					}
				} else {
					return
				}
			}
			
			try {
				// Remove type restrictions to get ALL types of places
				const request: any = {
					input: query,
					componentRestrictions: { country: 'pk' }
					// Don't restrict types - let Google return all relevant results
				}
				
				console.log('📤 Sending autocomplete request:', request)
				
				autocompleteServiceRef.current.getPlacePredictions(
					request,
					(predictions: any[], status: string) => {
						console.log('📥 Search response:', { 
							status, 
							statusCode: status,
							count: predictions?.length || 0,
							firstResult: predictions?.[0]?.description,
							allResults: predictions?.map(p => p.description)
						})
						
						if (status === window.google.maps.places.PlacesServiceStatus.OK) {
							if (predictions && predictions.length > 0) {
								const formatted = predictions.slice(0, 15).map(p => ({
									place_id: p.place_id,
									description: p.description,
									main_text: p.structured_formatting?.main_text || p.description.split(',')[0],
									secondary_text: p.structured_formatting?.secondary_text || p.description
								}))
								console.log('✅ Setting suggestions:', formatted.length, 'items')
								setSearchSuggestions(formatted)
								setShowSuggestions(true)
							} else {
								console.warn('⚠️ No predictions returned')
								setSearchSuggestions([])
								setShowSuggestions(false)
							}
						} else {
							// Handle different error statuses
							const statusMessages: Record<string, string> = {
								[window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS]: 'No results found',
								[window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED]: 'Request denied - check API key and billing',
								[window.google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT]: 'Over query limit',
								[window.google.maps.places.PlacesServiceStatus.INVALID_REQUEST]: 'Invalid request'
							}
							console.error('❌ Autocomplete error:', status, statusMessages[status] || 'Unknown error')
							setSearchSuggestions([])
							setShowSuggestions(false)
						}
					}
				)
			} catch (error) {
				console.error('❌ Exception calling getPlacePredictions:', error)
				setSearchSuggestions([])
				setShowSuggestions(false)
			}
		}, 300)
		
		return () => clearTimeout(timeout)
	}, [searchQuery, mapLoaded])

	function initMap() {
		if (!mapRef.current || !window.google || mapInstanceRef.current) {
			console.log('Cannot init map:', {
				hasMapRef: !!mapRef.current,
				hasGoogle: !!window.google,
				hasInstance: !!mapInstanceRef.current
			})
			return
		}
		
		// Default to Lahore, Pakistan if no user location
		const defaultCenter = { lat: 31.5204, lng: 74.3587 } // Lahore center
		const center = userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng) && userLocation.lat !== 0 && userLocation.lng !== 0
			? { lat: userLocation.lat, lng: userLocation.lng }
			: defaultCenter
		
		console.log('🗺️ Initializing map with center:', center.lat, center.lng, userLocation ? '(user location)' : '(default)')
		
		const map = new window.google.maps.Map(mapRef.current, {
			center: center,
			zoom: userLocation ? 15 : 12,
			mapTypeControl: true,
			streetViewControl: true,
			fullscreenControl: true
		})
		
		mapInstanceRef.current = map
		
		// Add click listener for manual selection
		map.addListener('click', async (e: any) => {
			if (locationSelectionMode === 'manual' || !userLocation) {
				const lat = e.latLng.lat()
				const lng = e.latLng.lng()
				
				// Update marker position
				if (markerInstanceRef.current) {
					markerInstanceRef.current.setPosition({ lat, lng })
				}
				
				// Update location and validate
				setUserLocation({ lat, lng })
				setLocationValidationError('')
				setNearbySocieties([])
				
				setLoadingAddress(true)
				try {
					// Validate location
					const validationResult = checkLocationInSocieties(lat, lng)
					if (validationResult.city && validationResult.society) {
						setSelectedCity(validationResult.city)
						setSelectedSociety(validationResult.society)
					} else {
						setSelectedCity('')
						setSelectedSociety('')
						if (validationResult.nearby && validationResult.nearby.length > 0) {
							setNearbySocieties(validationResult.nearby)
							setLocationValidationError(`Your location is not within any delivery area. Nearby delivery areas:`)
						} else {
							setLocationValidationError('Your location is not within any delivery area. Please select a location within our delivery zones.')
						}
					}
					
					// Get address
					let addressData = null
					try {
						const apiRes = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
						const apiJson = await apiRes.json()
						if (apiJson.success && apiJson.data) {
							addressData = apiJson.data
						} else {
							addressData = await reverseGeocode(lat, lng)
						}
					} catch (apiErr) {
						addressData = await reverseGeocode(lat, lng)
					}
					
					if (addressData) {
						setUserAddress(addressData.address)
					} else {
						setUserAddress(`Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
					}
				} catch (err) {
					console.error('Error handling map click:', err)
					setUserAddress(`Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
				} finally {
					setLoadingAddress(false)
				}
			}
		})
		
		// Add marker - use user location if available, otherwise use default center
		if (markerInstanceRef.current) {
			markerInstanceRef.current.setMap(null)
		}
		
		markerInstanceRef.current = new window.google.maps.Marker({
			position: center,
			map: map,
			title: userLocation ? 'Your Location' : 'Select Your Location',
			icon: {
				url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
			},
			draggable: true
		})
		
		// Update userLocation when marker is dragged (even if no initial location)
		markerInstanceRef.current.addListener('dragend', async (e: any) => {
			const newLat = e.latLng.lat()
			const newLng = e.latLng.lng()
			
			console.log('🎯 Marker dragged to:', { lat: newLat, lng: newLng })
			
			setUserLocation({ lat: newLat, lng: newLng })
			setLocationValidationError('')
			setNearbySocieties([])
			
			setLoadingAddress(true)
			try {
				// Get current delivery areas from state (use a function to get latest)
				// We need to access the latest deliveryAreas, so we'll fetch it fresh or use closure
				const currentAreas = deliveryAreas.length > 0 ? deliveryAreas : await fetch('/api/delivery-areas?activeOnly=true').then(r => r.json()).then(d => d.success ? d.data : [])
				
				console.log('📦 Delivery areas for validation:', currentAreas.length)
				
				// First, check if location is within any society's bounds or radius
				const validationResult = checkLocationInSocietiesWithData(newLat, newLng, currentAreas)
				console.log('🔍 Validation result:', validationResult)
				
				if (validationResult.city && validationResult.society) {
					console.log('✅ Location matched society:', validationResult)
					// Auto-fill city and society
					setSelectedCity(validationResult.city)
					setSelectedSociety(validationResult.society)
					setLocationValidationError('') // Clear any error
					setNearbySocieties([]) // Clear nearby
				} else {
					// Location not in any society
					console.log('❌ Location NOT in any society')
					setSelectedCity('')
					setSelectedSociety('')
					if (validationResult.nearby && validationResult.nearby.length > 0) {
						setNearbySocieties(validationResult.nearby)
						setLocationValidationError(`Your location is not within any delivery area. Nearby delivery areas:`)
					} else {
						setLocationValidationError('Your location is not within any delivery area. Please select a location within our delivery zones.')
					}
				}
				
				// Get address from coordinates
				let addressData = null
				try {
					const apiRes = await fetch(`/api/geocode/reverse?lat=${newLat}&lng=${newLng}`)
					const apiJson = await apiRes.json()
					if (apiJson.success && apiJson.data) {
						addressData = apiJson.data
					} else {
						// Fallback to client-side
						addressData = await reverseGeocode(newLat, newLng)
					}
				} catch (apiErr) {
					// Fallback to client-side
					addressData = await reverseGeocode(newLat, newLng)
				}
				
				if (addressData) {
					setUserAddress(addressData.address)
					// Only set city if not already matched from society
					if (!validationResult.city) {
						setUserCity(addressData.city || '')
					}
				} else {
					setUserAddress(`Location: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`)
				}
			} catch (err) {
				console.error('Reverse geocoding error:', err)
				setUserAddress(`Location: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`)
			} finally {
				setLoadingAddress(false)
			}
		})
		
		// Draw delivery area boundaries if society is selected
		if (selectedSociety) {
			drawSocietyBoundary()
		}
	}

	function drawSocietyBoundary() {
		if (!mapInstanceRef.current || !window.google || !selectedCity || !selectedSociety) return
		
		const cityArea = deliveryAreas.find(area => area.city === selectedCity)
		if (!cityArea) return
		
		const society = cityArea.deliveryAreas.find(s => s.name === selectedSociety)
		if (!society || !society.bounds) return
		
		// Clear existing boundaries
		if (mapInstanceRef.current.boundaryPolygon) {
			mapInstanceRef.current.boundaryPolygon.setMap(null)
		}
		
		const bounds = new window.google.maps.LatLngBounds(
			{ lat: society.bounds.southwest.lat, lng: society.bounds.southwest.lng },
			{ lat: society.bounds.northeast.lat, lng: society.bounds.northeast.lng }
		)
		
		const rectangle = new window.google.maps.Rectangle({
			bounds: bounds,
			editable: false,
			draggable: false,
			map: mapInstanceRef.current,
			fillColor: '#00FF00',
			fillOpacity: 0.1,
			strokeColor: '#00FF00',
			strokeOpacity: 0.8,
			strokeWeight: 2
		})
		
		mapInstanceRef.current.boundaryPolygon = rectangle
		mapInstanceRef.current.fitBounds(bounds)
	}

	// Function to navigate map to a searched location (without setting as user location)
	async function navigateToLocation(placeId: string) {
		if (!window.google || !window.google.maps || !window.google.maps.places) {
			showError('Google Maps not loaded. Please wait for the map to load.', 'Map Not Ready')
			return
		}
		
		if (!placeId || placeId.trim() === '') {
			showError('Invalid location selected. Please try again.', 'Invalid Location')
			return
		}
		
		console.log('🔍 Navigating to location:', placeId, {
			hasMap: !!mapInstanceRef.current,
			hasMapRef: !!mapRef.current,
			mapLoaded: mapLoaded
		})
		
		// Ensure map is loaded and initialized
		if (!mapLoaded) {
			showError('Map is still loading. Please wait a moment.', 'Map Loading')
			return
		}
		
		// Ensure map is initialized - but don't reinitialize if it already exists
		if (!mapInstanceRef.current) {
			if (mapRef.current) {
				console.log('🗺️ Map not initialized, initializing now...')
				initMap()
				// Wait for map to initialize
				await new Promise(resolve => setTimeout(resolve, 500))
			} else {
				showError('Map container not found. Please refresh the page.', 'Map Error')
				return
			}
		}
		
		// Verify map instance still exists
		if (!mapInstanceRef.current) {
			console.error('❌ Map instance is null after initialization attempt')
			showError('Failed to initialize map. Please refresh the page.', 'Map Error')
			return
		}
		
		// Create a new PlacesService instance - use the map instance, not a div
		const service = new window.google.maps.places.PlacesService(mapInstanceRef.current)
		
		try {
			service.getDetails(
				{
					placeId: placeId,
					fields: ['place_id', 'name', 'geometry', 'formatted_address', 'address_components']
				},
				(place: any, status: string) => {
					console.log('📥 Place details response:', { 
						status, 
						hasPlace: !!place,
						placeName: place?.name,
						hasMap: !!mapInstanceRef.current,
						mapDivVisible: mapRef.current ? mapRef.current.offsetWidth > 0 : false
					})
					
					const PlacesServiceStatus = window.google.maps.places.PlacesServiceStatus
					
					if (status === PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
						const lat = place.geometry.location.lat()
						const lng = place.geometry.location.lng()
						
						console.log('✅ Navigating map to:', { lat, lng, address: place.formatted_address })
						
						// Verify map instance still exists before using it
						if (!mapInstanceRef.current) {
							console.error('❌ Map instance disappeared!')
							showError('Map instance lost. Please refresh the page.', 'Map Error')
							return
						}
						
						try {
							// If place has bounds, fit the map to those bounds
							if (place.geometry.bounds) {
								mapInstanceRef.current.fitBounds(place.geometry.bounds)
								window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
									if (mapInstanceRef.current && mapInstanceRef.current.getZoom() && mapInstanceRef.current.getZoom()! > 18) {
										mapInstanceRef.current.setZoom(18)
									}
								})
							} else if (place.geometry.viewport) {
								mapInstanceRef.current.fitBounds(place.geometry.viewport)
								window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
									if (mapInstanceRef.current && mapInstanceRef.current.getZoom() && mapInstanceRef.current.getZoom()! > 18) {
										mapInstanceRef.current.setZoom(18)
									}
								})
							} else {
								// No bounds, just center and zoom
								mapInstanceRef.current.setCenter({ lat, lng })
								mapInstanceRef.current.setZoom(16)
							}
							
							// Update marker position (marker should already exist from initMap)
							if (markerInstanceRef.current) {
								// Just update position - the dragend listener from initMap will handle validation
								markerInstanceRef.current.setPosition({ lat, lng })
								// Add animation to marker
								if (markerInstanceRef.current.setAnimation && window.google.maps.Animation) {
									markerInstanceRef.current.setAnimation(window.google.maps.Animation.DROP)
								}
								
								// Don't clear userLocation - set it to the navigated location
								// This allows validation to work immediately if user doesn't drag
								setUserLocation({ lat, lng })
								
								// Clear previous validation state and re-validate immediately
								setSelectedCity('')
								setSelectedSociety('')
								setLocationValidationError('')
								setNearbySocieties([])
								
								// Trigger validation immediately for the navigated location
								setTimeout(async () => {
									try {
										// Get fresh delivery areas
										const currentAreas = deliveryAreas.length > 0 ? deliveryAreas : await fetch('/api/delivery-areas?activeOnly=true').then(r => r.json()).then(d => d.success ? d.data : [])
										const validationResult = checkLocationInSocietiesWithData(lat, lng, currentAreas)
										
										if (validationResult.city && validationResult.society) {
											console.log('✅ Navigated location matches society:', validationResult)
											setSelectedCity(validationResult.city)
											setSelectedSociety(validationResult.society)
											setLocationValidationError('')
											setNearbySocieties([])
										} else {
											// Location not in any society - user can drag to adjust
											setSelectedCity('')
											setSelectedSociety('')
											if (validationResult.nearby && validationResult.nearby.length > 0) {
												setNearbySocieties(validationResult.nearby)
												setLocationValidationError(`Your location is not within any delivery area. Nearby delivery areas:`)
											} else {
												setLocationValidationError('Your location is not within any delivery area. Please select a location within our delivery zones.')
											}
										}
									} catch (err) {
										console.error('Error validating navigated location:', err)
									}
								}, 300)
							} else {
								// Marker doesn't exist, create it - but this should rarely happen
								// as initMap should have created it. If we're here, we need to create it
								console.log('📍 Creating marker (should not happen normally)...')
								markerInstanceRef.current = new window.google.maps.Marker({
									position: { lat, lng },
									map: mapInstanceRef.current,
									title: 'Your Location',
									icon: {
										url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
									},
									draggable: true
								})
								
								// Add dragend listener - use the same logic as in initMap
								markerInstanceRef.current.addListener('dragend', async (e: any) => {
									const newLat = e.latLng.lat()
									const newLng = e.latLng.lng()
									setUserLocation({ lat: newLat, lng: newLng })
									setLocationValidationError('')
									setNearbySocieties([])
									
									setLoadingAddress(true)
									try {
										// First, check if location is within any society's bounds or radius
										const validationResult = checkLocationInSocieties(newLat, newLng)
										if (validationResult.city && validationResult.society) {
											console.log('Location matched society:', validationResult)
											// Auto-fill city and society
											setSelectedCity(validationResult.city)
											setSelectedSociety(validationResult.society)
										} else {
											// Location not in any society
											setSelectedCity('')
											setSelectedSociety('')
											if (validationResult.nearby && validationResult.nearby.length > 0) {
												setNearbySocieties(validationResult.nearby)
												setLocationValidationError(`Your location is not within any delivery area. Nearby delivery areas:`)
											} else {
												setLocationValidationError('Your location is not within any delivery area. Please select a location within our delivery zones.')
											}
										}
										
										// Get address from coordinates
										let addressData = null
										try {
											const apiRes = await fetch(`/api/geocode/reverse?lat=${newLat}&lng=${newLng}`)
											const apiJson = await apiRes.json()
											if (apiJson.success && apiJson.data) {
												addressData = apiJson.data
											} else {
												// Fallback to client-side
												addressData = await reverseGeocode(newLat, newLng)
											}
										} catch (apiErr) {
											// Fallback to client-side
											addressData = await reverseGeocode(newLat, newLng)
										}
										
										if (addressData) {
											setUserAddress(addressData.address || addressData.formatted_address || 'Selected location')
											// Only set city if not already matched from society
											if (!validationResult.city) {
												// Check if setUserCity exists (it might not be defined)
												if (typeof setUserCity === 'function') {
													setUserCity(addressData.city || '')
												}
											}
										} else {
											setUserAddress(`Location: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`)
										}
									} catch (err) {
										console.error('Reverse geocoding error:', err)
										setUserAddress(`Location: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`)
									} finally {
										setLoadingAddress(false)
									}
								})
							}
						} catch (mapError: any) {
							console.error('❌ Error updating map:', mapError)
							showError('Failed to update map. Please try again.', 'Map Error')
						}
						
						// Don't set userLocation here - let user drag marker to select precise location
						// The dragend handler will validate and set the location
					} else {
						// Handle different error statuses
						const statusMessages: Record<string, string> = {
							[PlacesServiceStatus.ZERO_RESULTS]: 'No location found with that ID',
							[PlacesServiceStatus.NOT_FOUND]: 'Location not found',
							[PlacesServiceStatus.REQUEST_DENIED]: 'Request denied - check API key and billing',
							[PlacesServiceStatus.OVER_QUERY_LIMIT]: 'Too many requests - please try again later',
							[PlacesServiceStatus.INVALID_REQUEST]: 'Invalid request - please try a different location'
						}
						
						const errorMsg = statusMessages[status] || `Failed to get location details (${status})`
						console.error('❌ Place details error:', { status, errorMsg, placeId })
						showError(errorMsg, 'Search Error')
					}
				}
			)
		} catch (err: any) {
			console.error('❌ Exception in navigateToLocation:', err)
			showError(err.message || 'Failed to navigate to location. Please try again.', 'Search Error')
		}
	}
	
	useEffect(() => {
		if (selectedSociety && mapInstanceRef.current) {
			drawSocietyBoundary()
		}
	}, [selectedSociety])

	async function handleSaveLocation() {
		if (!userLocation) {
			showError('Please wait for your location to be detected or select it manually on the map.', 'Location Required')
			return
		}
		
		// Validate location is within a delivery area
		const validationResult = checkLocationInSocieties(userLocation.lat, userLocation.lng)
		if (!validationResult.city || !validationResult.society) {
			if (validationResult.nearby && validationResult.nearby.length > 0) {
				const nearbyList = validationResult.nearby.map(s => `${s.name}, ${s.city} (${s.distance} km)`).join('\n')
				showError(`Your location is not within any delivery area.\n\nNearby delivery areas:\n${nearbyList}`, 'Location Out of Range')
			} else {
				showError('Your location is not within any delivery area. Please select a location within our delivery zones.', 'Location Out of Range')
			}
			return
		}
		
		// Use validated city and society
		const city = validationResult.city
		const society = validationResult.society
		
		setSaving(true)
		
		try {
		// Build a user-friendly address instead of showing coordinates
		let fullAddress = ''
		
		// Start with society if available (most specific)
		if (society) {
			fullAddress = society
			// Add city if different
			if (city && !society.includes(city)) {
				fullAddress += `, ${city}`
			}
		} else if (userAddress && !userAddress.startsWith('Location:') && !userAddress.match(/^\d+\.\d+,\s*\d+\.\d+/)) {
			// Use the geocoded address if available and not coordinates
			fullAddress = userAddress
			// Add city if not already in address
			if (city && !fullAddress.includes(city)) {
				fullAddress += `, ${city}`
			}
		} else {
			// Fallback to city
			fullAddress = city || 'Selected location'
		}
		
		// Add additional details
		if (streetNumber) fullAddress += `, Street ${streetNumber}`
		if (houseNumber) fullAddress += `, House ${houseNumber}`
		if (landmark) fullAddress += `, Near ${landmark}`
		
		const res = await fetch('/api/user-delivery-location', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				address: fullAddress,
				latitude: userLocation.lat,
				longitude: userLocation.lng,
				city: city,
				society: society,
				streetNumber: streetNumber || undefined,
				houseNumber: houseNumber || undefined,
				landmark: landmark || undefined
			})
		})
			
			const json = await res.json()
			
			if (!res.ok || !json.success) {
				if (json.errors?.error === 'OUT_OF_RANGE') {
					showError('Delivery is not available at this location. Please select another area.', 'Delivery Not Available')
				} else {
					showError(json.message || 'Failed to save location', 'Save Error')
				}
				setSaving(false)
				return
			}
			
			const savedLocation = {
				address: fullAddress,
				latitude: userLocation.lat,
				longitude: userLocation.lng,
				city: city,
				society: society,
				streetNumber: streetNumber || undefined,
				houseNumber: houseNumber || undefined,
				landmark: landmark || undefined,
				userEmail: session?.user?.email || null
			}
			
			localStorage.setItem('deliveryLocation', JSON.stringify(savedLocation))
			localStorage.setItem('deliveryCity', city)
			
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('deliveryLocationUpdated', { detail: savedLocation }))
			}
			
			// Update saved location data
			setSavedLocationData(savedLocation)
			setShowEditMode(false)
			
			toast.success('Location saved successfully')
			router.push(redirectUrl as any)
		} catch (err) {
			console.error('Save location error:', err)
			showError('Failed to save location. Please try again.', 'Save Error')
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="min-h-screen bg-white">
			{/* Header */}
			<div className="border-b">
				<div className="container-pg py-3 sm:py-4">
					<h1 className="text-lg sm:text-xl font-semibold">Select Your Delivery Location</h1>
				</div>
			</div>

			<div className="container-pg py-4 sm:py-6">
				{loadingLocation ? (
					<div className="text-center py-12">
						<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brand-accent" />
						<p className="text-gray-600">Getting your precise location...</p>
						<p className="text-sm text-gray-500 mt-2">Please allow location access in your browser</p>
					</div>
				) : (
					<div className="space-y-6">
						{/* Show saved location if exists and not in edit mode */}
						{savedLocationData && !showEditMode && (
							<div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
									<div className="flex items-start gap-3 flex-1 min-w-0">
										<MapPin className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
										<div className="flex-1 min-w-0">
											<div className="font-medium text-green-900 text-sm sm:text-base">Your Saved Location</div>
											<div className="text-xs sm:text-sm text-green-700 mt-1 break-words">
												{savedLocationData.address || savedLocationData.society || savedLocationData.city || 'Saved location'}
											</div>
											{savedLocationData.society && (
												<div className="text-xs text-green-600 mt-1">
													{savedLocationData.society}{savedLocationData.city ? `, ${savedLocationData.city}` : ''}
												</div>
											)}
											{(savedLocationData.streetNumber || savedLocationData.houseNumber || savedLocationData.landmark) && (
												<div className="text-xs text-green-600 mt-1">
													{savedLocationData.streetNumber && `Street ${savedLocationData.streetNumber}`}
													{savedLocationData.streetNumber && savedLocationData.houseNumber && ' • '}
													{savedLocationData.houseNumber && `House ${savedLocationData.houseNumber}`}
													{(savedLocationData.streetNumber || savedLocationData.houseNumber) && savedLocationData.landmark && ' • '}
													{savedLocationData.landmark && `Near ${savedLocationData.landmark}`}
												</div>
											)}
										</div>
									</div>
									<button
										onClick={() => {
											setShowEditMode(true)
											// Load saved location into form
											if (savedLocationData.latitude && savedLocationData.longitude) {
												setUserLocation({ lat: savedLocationData.latitude, lng: savedLocationData.longitude })
												setUserAddress(savedLocationData.address || '')
												setSelectedCity(savedLocationData.city || '')
												setSelectedSociety(savedLocationData.society || '')
												setStreetNumber(savedLocationData.streetNumber || '')
												setHouseNumber(savedLocationData.houseNumber || '')
												setLandmark(savedLocationData.landmark || '')
												setUserCity(savedLocationData.city || '')
											}
										}}
										className="w-full sm:w-auto px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent/90 transition-colors text-sm font-medium whitespace-nowrap"
									>
										Edit Location
									</button>
								</div>
							</div>
						)}
						
						{/* Step 1: Show detected location (only if location was detected and not showing saved location) */}
						{userLocation && (!savedLocationData || showEditMode) && (
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
								<div className="flex items-start gap-3">
									<MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
									<div className="flex-1 min-w-0">
										<div className="font-medium text-blue-900 text-sm sm:text-base">Your Location Detected</div>
										{loadingAddress ? (
											<div className="text-xs sm:text-sm text-blue-700 mt-1">Loading address...</div>
										) : (
											<div className="text-xs sm:text-sm text-blue-700 mt-1 break-words">{userAddress || 'Address loading...'}</div>
										)}
										<div className="text-xs text-blue-600 mt-1 break-all">
											Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}
										</div>
									</div>
								</div>
							</div>
						)}
						
						{!userLocation && (!savedLocationData || showEditMode) && (
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
								<div className="flex items-start gap-3">
									<Navigation className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
									<div className="flex-1 min-w-0">
										<div className="font-medium text-yellow-900 text-sm sm:text-base">Location Not Available</div>
										<div className="text-xs sm:text-sm text-yellow-700 mt-1 break-words">
											Please search for a location or select it manually on the map below.
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Search Location and Map - Only show if no saved location or in edit mode */}
						{(!savedLocationData || showEditMode) && (
							<>
						{/* Search Location - Always visible above map */}
						<div className="space-y-2">
							<label className="block text-sm font-semibold text-gray-700">
								Search for Location
							</label>
							<div className="relative w-full">
								<input
									type="text"
									value={searchQuery}
									onChange={e => {
										setSearchQuery(e.target.value)
										if (e.target.value.trim()) {
											setShowSuggestions(true)
										}
									}}
									onFocus={() => {
										if (searchSuggestions.length > 0) {
											setShowSuggestions(true)
										}
									}}
									placeholder="Search for area, society, landmark, or address..."
									className="w-full rounded-lg border border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 pr-10 text-sm sm:text-base focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all"
									disabled={loadingAddress}
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => {
											setSearchQuery('')
											setSearchSuggestions([])
											setShowSuggestions(false)
										}}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								)}
								{showSuggestions && searchSuggestions.length > 0 && (
									<div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
										{searchSuggestions.map((suggestion, idx) => (
											<button
												key={suggestion.place_id || idx}
												type="button"
												onClick={async () => {
													console.log('🔘 Clicked suggestion:', suggestion.description)
													setSearchQuery(suggestion.description)
													setShowSuggestions(false)
													setSearchSuggestions([])
													await navigateToLocation(suggestion.place_id)
												}}
												className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 flex items-start gap-3 transition-colors first:rounded-t-lg last:rounded-b-lg"
											>
												<MapPin className="h-5 w-5 text-brand-accent flex-shrink-0 mt-0.5" />
												<div className="flex-1">
													<div className="font-medium text-sm text-gray-900">
														{suggestion.main_text || suggestion.description.split(',')[0]}
													</div>
													{suggestion.secondary_text && (
														<div className="text-xs text-gray-500 mt-0.5">{suggestion.secondary_text}</div>
													)}
													{!suggestion.secondary_text && suggestion.description.includes(',') && (
														<div className="text-xs text-gray-500 mt-0.5">
															{suggestion.description.split(',').slice(1).join(',').trim()}
														</div>
													)}
												</div>
											</button>
										))}
									</div>
								)}
							</div>
							<p className="text-xs text-gray-500 max-w-2xl">
								💡 Search for a location or drag the marker on the map to select your precise location
							</p>
						</div>

						{/* Map */}
						<div className="space-y-2">
							<label className="block text-sm font-semibold text-gray-700">
								Your Location on Map (drag marker to adjust)
							</label>
							<div className="relative rounded-lg overflow-hidden border border-gray-300 shadow-sm">
								<div ref={mapRef} className="w-full h-64 sm:h-80 md:h-96 bg-gray-100" />
								{!mapLoaded && (
									<div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
										<div className="text-center">
											<div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
											<p className="text-sm text-gray-600">Loading map...</p>
										</div>
									</div>
								)}
							</div>
						</div>
						
						{/* Location Validation Error */}
						{locationValidationError && (
							<div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
								<div className="flex items-start gap-3">
									<X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
									<div className="flex-1 min-w-0">
										<div className="font-medium text-red-900 text-sm sm:text-base">Location Not in Delivery Area</div>
										<div className="text-xs sm:text-sm text-red-700 mt-1 break-words">{locationValidationError}</div>
										{nearbySocieties.length > 0 && (
											<div className="mt-3 space-y-1">
												{nearbySocieties.map((society, idx) => (
													<div key={idx} className="text-xs sm:text-sm text-red-600 break-words">
														• {society.name}, {society.city} ({society.distance} km away)
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
						
						{/* Auto-detected City/Society Info */}
						{selectedCity && selectedSociety && (
							<div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
								<div className="flex items-start gap-3">
									<Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
									<div className="flex-1 min-w-0">
										<div className="font-medium text-green-900 text-sm sm:text-base">Delivery Area Detected</div>
										<div className="text-xs sm:text-sm text-green-700 mt-1 break-words">
											City: {selectedCity} | Society: {selectedSociety}
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Step 4: Additional Details - Always show if location is selected */}
						{userLocation && (
							<div className="space-y-4 border-t pt-6">
								<h3 className="font-medium text-gray-900">Additional Details (Optional)</h3>
								<p className="text-sm text-gray-600">Add more details to help us find your exact location</p>
								
								<div className="grid sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Street Number
										</label>
										<input
											type="text"
											value={streetNumber}
											onChange={e => setStreetNumber(e.target.value)}
											placeholder="e.g., 5"
											className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
										/>
									</div>
									
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											House Number
										</label>
										<input
											type="text"
											value={houseNumber}
											onChange={e => setHouseNumber(e.target.value)}
											placeholder="e.g., 123"
											className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
										/>
									</div>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Landmark
									</label>
									<input
										type="text"
										value={landmark}
										onChange={e => setLandmark(e.target.value)}
										placeholder="e.g., Near Masjid, Behind School"
										className="w-full rounded-md border px-3 py-2 text-sm sm:text-base"
									/>
								</div>
							</div>
						)}

						{/* Action Buttons */}
						<div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
							<button
								onClick={handleSaveLocation}
								disabled={!selectedCity || !selectedSociety || saving}
								className="w-full sm:flex-1 bg-brand-accent hover:bg-orange-600 text-white font-medium py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
							>
								{saving ? (
									<>
										<Loader2 className="h-5 w-5 animate-spin" />
										Saving...
									</>
								) : (
									<>
										<Check className="h-5 w-5" />
										SAVE LOCATION
									</>
								)}
							</button>
							<button
								onClick={() => {
									if (savedLocationData && showEditMode) {
										setShowEditMode(false)
									} else {
										router.push(redirectUrl as any)
									}
								}}
								className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm sm:text-base"
							>
								{savedLocationData && showEditMode ? 'CANCEL EDIT' : 'CANCEL'}
							</button>
						</div>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

export default function ChangeLocationPage() {
	return (
		<Suspense fallback={
			<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
				<div className="w-full max-w-md">
					<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
						<div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p className="text-sm text-gray-600">Loading...</p>
					</div>
				</div>
			</div>
		}>
			<ChangeLocationContent />
		</Suspense>
	)
}
