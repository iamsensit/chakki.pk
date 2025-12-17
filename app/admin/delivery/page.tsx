"use client"

import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Save, X, MapPin, Check } from 'lucide-react'
import { getPlaceDetails, extractSocietyData, type SocietyData } from '@/app/lib/google-maps'

interface Society {
	name: string
	placeId?: string
	address?: string
	latitude: number
	longitude: number
	radius: number
	bounds?: {
		northeast: { lat: number; lng: number }
		southwest: { lat: number; lng: number }
	}
	viewport?: {
		northeast: { lat: number; lng: number }
		southwest: { lat: number; lng: number }
	}
}

interface DeliveryArea {
	_id?: string
	deliveryType?: 'range' | 'city'
	city: string
	shopLocation: {
		address: string
		latitude: number
		longitude: number
	}
	deliveryRadius: number
	deliveryAreas: Society[]
	isActive: boolean
	displayOrder: number
}

declare global {
	interface Window {
		google: any
	}
}

export default function DeliveryManagementPage() {
	const [areas, setAreas] = useState<DeliveryArea[]>([])
	const [loading, setLoading] = useState(true)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [showNewForm, setShowNewForm] = useState(false)
	
	// Map state
	const [selectedCity, setSelectedCity] = useState<{ name: string; lat: number; lng: number; placeId: string } | null>(null)
	const [selectedSocieties, setSelectedSocieties] = useState<Society[]>([])
	const [loadingSocietyDetails, setLoadingSocietyDetails] = useState(false)
	const [mapMode, setMapMode] = useState<'city' | 'society'>('city') // 'city' for selecting city, 'society' for selecting societies
	
	// Search state - separate for city and society
	const [citySearchQuery, setCitySearchQuery] = useState('')
	const [societySearchQuery, setSocietySearchQuery] = useState('')
	const [searchSuggestions, setSearchSuggestions] = useState<Array<{ place_id: string; description: string; main_text?: string; secondary_text?: string }>>([])
	const [showSuggestions, setShowSuggestions] = useState(false)
	
	// Map refs
	const mapRef = useRef<HTMLDivElement>(null)
	const mapInstanceRef = useRef<any>(null)
	const [mapLoaded, setMapLoaded] = useState(false)
	const autocompleteRef = useRef<any>(null)
	const searchInputRef = useRef<HTMLInputElement>(null)
	const suggestionsRef = useRef<HTMLDivElement>(null)
	
	const [newArea, setNewArea] = useState<DeliveryArea>({
		deliveryType: 'city',
		city: '',
		shopLocation: { address: '', latitude: 0, longitude: 0 },
		deliveryRadius: 0,
		deliveryAreas: [],
		isActive: true,
		displayOrder: 0
	})

	useEffect(() => {
		loadAreas()
		loadGoogleMaps()
	}, [])

	// Handle city search input changes
	useEffect(() => {
		if (mapMode !== 'city' || selectedCity) {
			setSearchSuggestions([])
			setShowSuggestions(false)
			return
		}
		
		const query = citySearchQuery.trim()
		if (!query || query.length < 2) {
			setSearchSuggestions([])
			setShowSuggestions(false)
			return
		}

		if (!autocompleteRef.current || !window.google) {
			return
		}

		const timeout = setTimeout(() => {
			performSearch(query, 'city')
		}, 300)

		return () => clearTimeout(timeout)
	}, [citySearchQuery, mapMode, selectedCity])

	// Handle society search input changes
	useEffect(() => {
		console.log('🔔 Society search effect triggered:', { 
			mapMode, 
			hasSelectedCity: !!selectedCity, 
			query: societySearchQuery,
			hasGoogle: !!window.google,
			hasPlaces: !!(window.google?.maps?.places),
			hasAutocomplete: !!autocompleteRef.current
		})

		if (mapMode !== 'society' || !selectedCity) {
			if (mapMode !== 'society') {
				console.log('⏭️ Skipping: mapMode is not society')
			}
			if (!selectedCity) {
				console.log('⏭️ Skipping: no city selected')
			}
			setSearchSuggestions([])
			setShowSuggestions(false)
			return
		}
		
		const query = societySearchQuery.trim()
		if (!query || query.length < 2) {
			console.log('⏭️ Skipping: query too short or empty')
			setSearchSuggestions([])
			setShowSuggestions(false)
			return
		}

		// Ensure Google Maps is loaded
		if (!window.google || !window.google.maps || !window.google.maps.places) {
			console.warn('⚠️ Google Maps Places API not ready yet')
			return
		}

		// Initialize autocomplete service if needed
		if (!autocompleteRef.current) {
			try {
				autocompleteRef.current = new window.google.maps.places.AutocompleteService()
				console.log('✅ AutocompleteService initialized in society search effect')
			} catch (error) {
				console.error('❌ Failed to initialize AutocompleteService:', error)
				return
			}
		}

		console.log('⏰ Setting timeout for society search:', query)
		const timeout = setTimeout(() => {
			console.log('🚀 Triggering society search for:', query)
			performSearch(query, 'society')
		}, 300)

		return () => {
			console.log('🧹 Cleaning up timeout')
			clearTimeout(timeout)
		}
	}, [societySearchQuery, mapMode, selectedCity])

	// Close suggestions when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
				searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
				setShowSuggestions(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	async function performSearch(query: string, mode: 'city' | 'society' = mapMode) {
		// Ensure autocomplete service is initialized
		if (!window.google || !window.google.maps || !window.google.maps.places) {
			console.error('Google Maps Places API not loaded')
			return
		}

		if (!autocompleteRef.current) {
			try {
				autocompleteRef.current = new window.google.maps.places.AutocompleteService()
				console.log('AutocompleteService initialized in performSearch')
			} catch (error) {
				console.error('Failed to initialize AutocompleteService:', error)
				return
			}
		}

		// Build search query - for societies, include city name for better results
		let searchInput = query
		if (mode === 'society' && selectedCity) {
			searchInput = `${query}, ${selectedCity.name}, Pakistan`
		}

		const request: any = {
			input: searchInput,
			componentRestrictions: { country: 'pk' }
		}

		// Add type filter based on mode
		if (mode === 'city') {
			request.types = ['(cities)']
		} else if (mode === 'society') {
			// For societies, use a simpler approach - don't restrict types too much
			// This allows Google to return neighborhoods, localities, establishments, etc.
			// Remove types restriction to get more results
			// request.types = ['establishment', 'neighborhood', 'sublocality']
		}

		console.log('🔍 Performing search:', { 
			originalQuery: query, 
			searchInput, 
			mode, 
			request,
			hasAutocomplete: !!autocompleteRef.current
		})

		try {
			autocompleteRef.current.getPlacePredictions(request, (predictions: any[], status: string) => {
				console.log('📥 Autocomplete response:', { 
					status, 
					statusCode: status,
					predictionsCount: predictions?.length || 0,
					firstPrediction: predictions?.[0]?.description
				})
				
				if (status === window.google.maps.places.PlacesServiceStatus.OK) {
					if (predictions && predictions.length > 0) {
						// For society mode, do minimal filtering
						let filtered = predictions
						if (selectedCity && mode === 'society') {
							// Very lenient filtering - accept anything that mentions Pakistan or the city
							filtered = predictions.filter(p => {
								const desc = p.description.toLowerCase()
								const cityName = selectedCity.name.toLowerCase()
								// Accept if mentions Pakistan, city name, or common city names
								return desc.includes('pakistan') || 
								       desc.includes(cityName) ||
								       desc.includes('lahore') || 
								       desc.includes('karachi') ||
								       desc.includes('islamabad') ||
								       desc.includes('rawalpindi')
							})
							
							// If filtering removed everything, show all results
							if (filtered.length === 0) {
								console.log('⚠️ Filtering removed all results, showing all predictions')
								filtered = predictions
							}
						}
						
						// Limit to 10 results for better UX
						const limited = filtered.slice(0, 10)
						
						const formatted = limited.map(pred => ({
							place_id: pred.place_id,
							description: pred.description,
							main_text: pred.structured_formatting?.main_text || pred.description.split(',')[0],
							secondary_text: pred.structured_formatting?.secondary_text || pred.description
						}))
						
						console.log('✅ Setting suggestions:', formatted.length, 'items')
						setSearchSuggestions(formatted)
						setShowSuggestions(true)
					} else {
						console.warn('⚠️ No predictions returned from API')
						setSearchSuggestions([])
						setShowSuggestions(false)
					}
				} else {
					// Handle different error statuses
					const statusMessages: Record<string, string> = {
						[window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS]: 'No results found',
						[window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED]: 'Request denied - check API key',
						[window.google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT]: 'Over query limit',
						[window.google.maps.places.PlacesServiceStatus.INVALID_REQUEST]: 'Invalid request'
					}
					
					console.error('❌ Autocomplete error:', status, statusMessages[status] || 'Unknown error')
					setSearchSuggestions([])
					setShowSuggestions(false)
				}
			})
		} catch (error) {
			console.error('❌ Exception calling getPlacePredictions:', error)
			setSearchSuggestions([])
			setShowSuggestions(false)
		}
	}

	async function selectFromSuggestion(suggestion: { place_id: string; description: string }) {
		if (!window.google) {
			toast.error('Google Maps not loaded')
			return
		}

		setLoadingSocietyDetails(true)

		try {
			const service = new window.google.maps.places.PlacesService(document.createElement('div'))
			
			service.getDetails(
				{
					placeId: suggestion.place_id,
					fields: ['place_id', 'name', 'geometry', 'formatted_address', 'address_components', 'types']
				},
				async (place: any, status: string) => {
					setLoadingSocietyDetails(false)
					
					if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
						if (mapMode === 'city') {
							await selectCityFromPlace(place)
							// Clear search after city is selected
							setCitySearchQuery('')
							setSearchSuggestions([])
							setShowSuggestions(false)
						} else if (mapMode === 'society') {
							await selectSocietyFromPlace(place)
							// Clear search after society is selected
							setSocietySearchQuery('')
							setSearchSuggestions([])
							setShowSuggestions(false)
						}
					} else {
						console.error('PlacesService status:', status)
						toast.error(`Failed to get place details: ${status}`)
					}
				}
			)
		} catch (error: any) {
			setLoadingSocietyDetails(false)
			console.error('Error in selectFromSuggestion:', error)
			toast.error('Failed to get place details: ' + (error.message || 'Unknown error'))
		}
	}

	// Load Google Maps script
	function loadGoogleMaps() {
		if (typeof window === 'undefined') return
		
		if (window.google) {
			// Initialize AutocompleteService if Google Maps is already loaded
			if (!autocompleteRef.current && window.google.maps && window.google.maps.places) {
				autocompleteRef.current = new window.google.maps.places.AutocompleteService()
				console.log('AutocompleteService initialized (already loaded)')
			}
			setMapLoaded(true)
			return
		}
		
		// Check if script already exists
		const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
		if (existingScript) {
			// Wait for it to load
			const checkInterval = setInterval(() => {
				if (window.google) {
					clearInterval(checkInterval)
					setMapLoaded(true)
				}
			}, 100)
			// Timeout after 10 seconds
			setTimeout(() => {
				clearInterval(checkInterval)
				if (!window.google) {
					console.error('Google Maps failed to load after timeout')
					toast.error('Google Maps failed to load. Please refresh the page.')
				}
			}, 10000)
			return
		}
		
		// Use API key from env or fallback
		const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyARQ9Qk-3zeRq6uibrDjZEJ-fwH4yNkOBc'
		
		if (!apiKey) {
			console.error('Google Maps API key not found')
			toast.error('Google Maps API key not configured')
			return
		}
		
		const script = document.createElement('script')
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing`
		script.async = true
		script.defer = true
		script.onload = () => {
			console.log('Google Maps script loaded successfully')
			// Small delay to ensure google object is available
			setTimeout(() => {
				if (window.google) {
					// Initialize AutocompleteService when Google Maps loads
					if (!autocompleteRef.current && window.google.maps && window.google.maps.places) {
						autocompleteRef.current = new window.google.maps.places.AutocompleteService()
						console.log('AutocompleteService initialized')
					}
					setMapLoaded(true)
				} else {
					console.error('Google Maps object not available after script load')
					toast.error('Google Maps failed to initialize')
				}
			}, 100)
		}
		script.onerror = (error) => {
			console.error('Failed to load Google Maps script:', error)
			toast.error('Failed to load Google Maps. Please check your API key and network connection.')
		}
		document.head.appendChild(script)
	}

	// Initialize map
	useEffect(() => {
		if (!showNewForm) {
			// Clean up map when form is closed
			if (mapInstanceRef.current) {
				// Don't destroy, just hide
				return
			}
			return
		}
		
		if (mapLoaded && window.google && mapRef.current) {
			// Wait a bit for DOM to be ready
			const timer = setTimeout(() => {
				if (mapRef.current && !mapInstanceRef.current) {
					// Check if map container is visible and has dimensions
					const rect = mapRef.current.getBoundingClientRect()
					if (rect.width > 0 && rect.height > 0) {
						initMap()
					} else {
						// Retry after a short delay
						setTimeout(() => {
							if (mapRef.current && !mapInstanceRef.current) {
								initMap()
							}
						}, 500)
					}
				}
			}, 300)
			
			return () => clearTimeout(timer)
		}
	}, [mapLoaded, showNewForm])

		// Update map when city is selected
	useEffect(() => {
		if (selectedCity && mapInstanceRef.current) {
			focusOnCity()
			setMapMode('society')
			setCitySearchQuery('') // Clear city search when switching to society mode
			setSocietySearchQuery('') // Clear society search
			setSearchSuggestions([])
		}
	}, [selectedCity])

	// Draw society boundaries when societies are added
	useEffect(() => {
		if (mapInstanceRef.current && selectedSocieties.length > 0) {
			drawSocietyBoundaries()
		}
	}, [selectedSocieties])

	function initMap() {
		if (!mapRef.current) {
			console.error('Map ref not available')
			return
		}
		
		if (!window.google) {
			console.error('Google Maps API not loaded')
			toast.error('Google Maps API not loaded. Please check your API key.')
			return
		}
		
		if (mapInstanceRef.current) {
			console.log('Map already initialized')
			return
		}
		
		try {
			// Ensure the map container has dimensions
			if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
				console.log('Map container has no dimensions, retrying...')
				setTimeout(() => initMap(), 200)
				return
			}
			
			// Center on Pakistan
			const map = new window.google.maps.Map(mapRef.current, {
				center: { lat: 30.3753, lng: 69.3451 }, // Center of Pakistan
				zoom: 6,
				mapTypeControl: true,
				streetViewControl: true,
				fullscreenControl: true,
				zoomControl: true,
				disableDefaultUI: false
			})
			
			mapInstanceRef.current = map
			console.log('Map initialized successfully')
			
			// Add click listener for city selection
			map.addListener('click', async (e: any) => {
				if (mapMode === 'city') {
					await handleMapClickForCity(e.latLng.lat(), e.latLng.lng())
				} else if (mapMode === 'society') {
					await handleMapClickForSociety(e.latLng.lat(), e.latLng.lng())
				}
			})
			
			// Initialize Places Autocomplete Service for manual suggestions
			if (searchInputRef.current) {
				autocompleteRef.current = new window.google.maps.places.AutocompleteService()
			}
		} catch (error) {
			console.error('Error initializing map:', error)
			toast.error('Failed to initialize map. Please refresh the page.')
		}
	}

	async function handleMapClickForCity(lat: number, lng: number) {
		if (!window.google) return
		
		setLoadingSocietyDetails(true)
		try {
			// Use reverse geocoding to get city name
			const geocoder = new window.google.maps.Geocoder()
			geocoder.geocode({ location: { lat, lng } }, async (results: any[], status: string) => {
				if (status === 'OK' && results && results.length > 0) {
					// Find city in address components
					let cityName = ''
					let placeId = ''
					
					for (const result of results) {
						for (const component of result.address_components) {
							if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
								cityName = component.long_name
								placeId = result.place_id
								break
							}
						}
						if (cityName) break
					}
					
					if (cityName) {
						setSelectedCity({
							name: cityName,
							lat: lat,
							lng: lng,
							placeId: placeId || ''
						})
						
						setNewArea({
							...newArea,
							city: cityName
						})
						
						toast.success(`Selected city: ${cityName}`)
					} else {
						toast.error('Could not determine city name. Please try clicking on a city area.')
					}
				} else {
					toast.error('Could not get location details. Please try again.')
				}
				setLoadingSocietyDetails(false)
			})
		} catch (err) {
			console.error('Error getting city:', err)
			toast.error('Failed to get city information')
			setLoadingSocietyDetails(false)
		}
	}

	async function handleMapClickForSociety(lat: number, lng: number) {
		if (!window.google || !selectedCity) return
		
		setLoadingSocietyDetails(true)
		try {
			// Use reverse geocoding to get place details
			const geocoder = new window.google.maps.Geocoder()
			geocoder.geocode({ location: { lat, lng } }, async (results: any[], status: string) => {
				if (status === 'OK' && results && results.length > 0) {
					const result = results[0]
					const placeId = result.place_id
					
					// Get place details to fetch boundaries
					const placeDetails = await getPlaceDetails(placeId)
					if (placeDetails) {
						const societyData = extractSocietyData(placeDetails)
						
						// Check if already added
						if (selectedSocieties.some(s => s.placeId === societyData.placeId || s.name.toLowerCase() === societyData.name.toLowerCase())) {
							toast.error('This society is already added')
							setLoadingSocietyDetails(false)
							return
						}
						
						const newSociety: Society = {
							name: societyData.name,
							placeId: societyData.placeId,
							address: societyData.address,
							latitude: societyData.center.lat,
							longitude: societyData.center.lng,
							radius: 0,
							bounds: societyData.bounds,
							viewport: societyData.viewport
						}
						
						setSelectedSocieties([...selectedSocieties, newSociety])
						toast.success(`Added ${societyData.name} with boundaries`)
					} else {
						toast.error('Could not fetch society details')
					}
				} else {
					toast.error('Could not get location details. Please try clicking on a society/area.')
				}
				setLoadingSocietyDetails(false)
			})
		} catch (err) {
			console.error('Error getting society:', err)
			toast.error('Failed to get society information')
			setLoadingSocietyDetails(false)
		}
	}

	async function selectCityFromPlace(place: any) {
		setLoadingSocietyDetails(true)
		try {
			let cityName = ''
			for (const component of place.address_components) {
				if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
					cityName = component.long_name
					break
				}
			}
			
			if (!cityName) {
				cityName = place.name
			}
			
			setSelectedCity({
				name: cityName,
				lat: place.geometry.location.lat(),
				lng: place.geometry.location.lng(),
				placeId: place.place_id
			})
			
			setNewArea({
				...newArea,
				city: cityName
			})
			
			toast.success(`Selected city: ${cityName}`)
		} catch (err) {
			console.error('Error selecting city:', err)
			toast.error('Failed to select city')
		} finally {
			setLoadingSocietyDetails(false)
		}
	}

	async function selectSocietyFromPlace(place: any) {
		setLoadingSocietyDetails(true)
		try {
			// Helper to extract lat/lng from Google Maps LatLng object
			const getLat = (obj: any): number => {
				if (!obj) return 0
				if (typeof obj === 'number') return obj
				if (typeof obj.lat === 'function') return obj.lat()
				return obj.lat || 0
			}
			
			const getLng = (obj: any): number => {
				if (!obj) return 0
				if (typeof obj === 'number') return obj
				if (typeof obj.lng === 'function') return obj.lng()
				return obj.lng || 0
			}
			
			// If place already has geometry, convert it properly
			let placeDetails = null
			if (place.geometry && place.place_id) {
				// Convert Google Maps LatLng objects to plain numbers
				const location = place.geometry.location
				const bounds = place.geometry.bounds
				const viewport = place.geometry.viewport
				
				placeDetails = {
					place_id: place.place_id,
					name: place.name || place.formatted_address?.split(',')[0] || 'Unknown',
					formatted_address: place.formatted_address || '',
					geometry: {
						location: {
							lat: getLat(location),
							lng: getLng(location)
						},
						bounds: bounds ? {
							northeast: {
								lat: getLat(bounds.northeast),
								lng: getLng(bounds.northeast)
							},
							southwest: {
								lat: getLat(bounds.southwest),
								lng: getLng(bounds.southwest)
							}
						} : undefined,
						viewport: viewport ? {
							northeast: {
								lat: getLat(viewport.northeast),
								lng: getLng(viewport.northeast)
							},
							southwest: {
								lat: getLat(viewport.southwest),
								lng: getLng(viewport.southwest)
							}
						} : undefined
					},
					address_components: place.address_components || [],
					types: place.types || []
				}
			} else if (place.place_id) {
				// Need to fetch details
				placeDetails = await getPlaceDetails(place.place_id)
			}
			
			if (!placeDetails) {
				toast.error('Failed to fetch society details')
				setLoadingSocietyDetails(false)
				return
			}
			
			const societyData = extractSocietyData(placeDetails)
			
			// Check if already added
			if (selectedSocieties.some(s => s.placeId === societyData.placeId || s.name.toLowerCase() === societyData.name.toLowerCase())) {
				toast.error('This society is already added')
				setLoadingSocietyDetails(false)
				return
			}
			
			// Calculate radius from bounds (approximate - distance from center to corner)
			let radius = 0
			if (societyData.bounds) {
				const centerLat = societyData.center.lat
				const centerLng = societyData.center.lng
				const neLat = societyData.bounds.northeast.lat
				const neLng = societyData.bounds.northeast.lng
				
				// Calculate distance from center to northeast corner (approximate radius)
				const R = 6371 // Earth's radius in km
				const dLat = (neLat - centerLat) * Math.PI / 180
				const dLng = (neLng - centerLng) * Math.PI / 180
				const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
					Math.cos(centerLat * Math.PI / 180) * Math.cos(neLat * Math.PI / 180) *
					Math.sin(dLng / 2) * Math.sin(dLng / 2)
				const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
				radius = R * c // Distance in km
				
				// Round to 2 decimal places
				radius = Math.round(radius * 100) / 100
			}
			
			const newSociety: Society = {
				name: societyData.name,
				placeId: societyData.placeId,
				address: societyData.address,
				latitude: societyData.center.lat,
				longitude: societyData.center.lng,
				radius: radius,
				bounds: societyData.bounds,
				viewport: societyData.viewport
			}
			
			setSelectedSocieties([...selectedSocieties, newSociety])
			
			// Update map to show the selected society immediately
			if (mapInstanceRef.current && societyData.bounds && window.google) {
				// Center map on society and show boundaries
				const bounds = new window.google.maps.LatLngBounds(
					{ lat: societyData.bounds.southwest.lat, lng: societyData.bounds.southwest.lng },
					{ lat: societyData.bounds.northeast.lat, lng: societyData.bounds.northeast.lng }
				)
				
				// Fit map to show the society bounds with padding
				mapInstanceRef.current.fitBounds(bounds, 50)
				
				// Draw the society boundary immediately
				const rectangle = new window.google.maps.Rectangle({
					bounds: bounds,
					editable: false,
					draggable: false,
					map: mapInstanceRef.current,
					fillColor: '#FF0000',
					fillOpacity: 0.15,
					strokeColor: '#FF0000',
					strokeOpacity: 0.9,
					strokeWeight: 3
				})
				
				// Add marker for society center
				const marker = new window.google.maps.Marker({
					position: { lat: societyData.center.lat, lng: societyData.center.lng },
					map: mapInstanceRef.current,
					title: societyData.name,
					icon: {
						url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
						scaledSize: new window.google.maps.Size(32, 32)
					},
					label: {
						text: societyData.name,
						color: '#000',
						fontSize: '12px',
						fontWeight: 'bold'
					}
				})
				
				// Store references for cleanup
				if (!mapInstanceRef.current.societyMarkers) {
					mapInstanceRef.current.societyMarkers = []
				}
				if (!mapInstanceRef.current.societyBoundaries) {
					mapInstanceRef.current.societyBoundaries = []
				}
				mapInstanceRef.current.societyMarkers.push(marker)
				mapInstanceRef.current.societyBoundaries.push(rectangle)
			}
			
			toast.success(`Added ${societyData.name} with boundaries (radius: ${radius.toFixed(2)} km)`)
			
			// Clear search after adding
			setSocietySearchQuery('')
			setSearchSuggestions([])
		} catch (err: any) {
			console.error('Error fetching society details:', err)
			toast.error('Failed to fetch society boundaries: ' + (err.message || 'Unknown error'))
		} finally {
			setLoadingSocietyDetails(false)
		}
	}

	function focusOnCity() {
		if (!mapInstanceRef.current || !selectedCity || !window.google) return
		
		// Get city boundaries from place details
		getPlaceDetails(selectedCity.placeId).then(placeDetails => {
			if (placeDetails && placeDetails.geometry) {
				// Show city boundaries if available
				if (placeDetails.geometry.bounds) {
					const bounds = new window.google.maps.LatLngBounds(
						{ 
							lat: typeof placeDetails.geometry.bounds.southwest === 'object' && placeDetails.geometry.bounds.southwest.lat 
								? placeDetails.geometry.bounds.southwest.lat 
								: (placeDetails.geometry.bounds.southwest as any).lat(),
							lng: typeof placeDetails.geometry.bounds.southwest === 'object' && placeDetails.geometry.bounds.southwest.lng
								? placeDetails.geometry.bounds.southwest.lng
								: (placeDetails.geometry.bounds.southwest as any).lng()
						},
						{ 
							lat: typeof placeDetails.geometry.bounds.northeast === 'object' && placeDetails.geometry.bounds.northeast.lat
								? placeDetails.geometry.bounds.northeast.lat
								: (placeDetails.geometry.bounds.northeast as any).lat(),
							lng: typeof placeDetails.geometry.bounds.northeast === 'object' && placeDetails.geometry.bounds.northeast.lng
								? placeDetails.geometry.bounds.northeast.lng
								: (placeDetails.geometry.bounds.northeast as any).lng()
						}
					)
					
					// Clear existing city boundary
					if (mapInstanceRef.current.cityBoundary) {
						mapInstanceRef.current.cityBoundary.setMap(null)
					}
					
					// Draw city boundary rectangle
					mapInstanceRef.current.cityBoundary = new window.google.maps.Rectangle({
						bounds: bounds,
						editable: false,
						draggable: false,
						map: mapInstanceRef.current,
						fillColor: '#4285F4',
						fillOpacity: 0.15,
						strokeColor: '#4285F4',
						strokeOpacity: 0.8,
						strokeWeight: 3
					})
					
					// Fit map to city bounds
					mapInstanceRef.current.fitBounds(bounds)
				} else {
					// If no bounds, just center on city
					const location = placeDetails.geometry.location
					let lat = selectedCity.lat
					let lng = selectedCity.lng
					
					if (location) {
						if (typeof location === 'object') {
							if (typeof (location as any).lat === 'function') {
								lat = (location as any).lat()
								lng = (location as any).lng()
							} else if ((location as any).lat !== undefined) {
								lat = (location as any).lat
								lng = (location as any).lng
							}
						}
					}
					
					mapInstanceRef.current.setCenter({ lat, lng })
					mapInstanceRef.current.setZoom(12)
				}
			} else {
				// Fallback: just center on city coordinates
				mapInstanceRef.current.setCenter({ lat: selectedCity.lat, lng: selectedCity.lng })
				mapInstanceRef.current.setZoom(12)
			}
			
			// Add marker for city center
			if (mapInstanceRef.current.cityMarker) {
				mapInstanceRef.current.cityMarker.setMap(null)
			}
			
			mapInstanceRef.current.cityMarker = new window.google.maps.Marker({
				position: { lat: selectedCity.lat, lng: selectedCity.lng },
				map: mapInstanceRef.current,
				title: selectedCity.name,
				icon: {
					url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
				},
				label: {
					text: selectedCity.name,
					color: '#000',
					fontSize: '14px',
					fontWeight: 'bold'
				}
			})
		}).catch(err => {
			console.error('Error getting city details:', err)
			// Fallback: just center on city coordinates
			mapInstanceRef.current.setCenter({ lat: selectedCity.lat, lng: selectedCity.lng })
			mapInstanceRef.current.setZoom(12)
		})
	}

	function drawSocietyBoundaries() {
		if (!mapInstanceRef.current || !window.google) return
		
		// Clear existing boundaries and markers
		if (mapInstanceRef.current.societyBoundaries) {
			mapInstanceRef.current.societyBoundaries.forEach((boundary: any) => boundary.setMap(null))
		}
		if (mapInstanceRef.current.societyMarkers) {
			mapInstanceRef.current.societyMarkers.forEach((marker: any) => marker.setMap(null))
		}
		if (mapInstanceRef.current.boundaryPolygons) {
			mapInstanceRef.current.boundaryPolygons.forEach((polygon: any) => polygon.setMap(null))
		}
		
		mapInstanceRef.current.societyBoundaries = []
		mapInstanceRef.current.societyMarkers = []
		mapInstanceRef.current.boundaryPolygons = []
		
		if (selectedSocieties.length === 0) return
		
		// Create bounds to fit all societies
		const allBounds = new window.google.maps.LatLngBounds()
		
		selectedSocieties.forEach((society, index) => {
			if (society.bounds) {
				const bounds = new window.google.maps.LatLngBounds(
					{ lat: society.bounds.southwest.lat, lng: society.bounds.southwest.lng },
					{ lat: society.bounds.northeast.lat, lng: society.bounds.northeast.lng }
				)
				
				// Extend allBounds to include this society
				allBounds.extend({ lat: society.bounds.southwest.lat, lng: society.bounds.southwest.lng })
				allBounds.extend({ lat: society.bounds.northeast.lat, lng: society.bounds.northeast.lng })
				
				// Create rectangle for bounds (red outline like Google Maps)
				const rectangle = new window.google.maps.Rectangle({
					bounds: bounds,
					editable: false,
					draggable: false,
					map: mapInstanceRef.current,
					fillColor: '#FF0000',
					fillOpacity: 0.15,
					strokeColor: '#FF0000',
					strokeOpacity: 0.9,
					strokeWeight: 3
				})
				
				mapInstanceRef.current.societyBoundaries.push(rectangle)
				mapInstanceRef.current.boundaryPolygons.push(rectangle)
				
				// Add marker for society center with label
				const marker = new window.google.maps.Marker({
					position: { lat: society.latitude, lng: society.longitude },
					map: mapInstanceRef.current,
					title: society.name,
					icon: {
						url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
						scaledSize: new window.google.maps.Size(32, 32)
					},
					label: {
						text: society.name,
						color: '#000',
						fontSize: '12px',
						fontWeight: 'bold',
						className: 'society-label'
					}
				})
				
				mapInstanceRef.current.societyMarkers.push(marker)
				mapInstanceRef.current.boundaryPolygons.push(marker)
			} else {
				// If no bounds, just show marker
				const marker = new window.google.maps.Marker({
					position: { lat: society.latitude, lng: society.longitude },
					map: mapInstanceRef.current,
					title: society.name,
					icon: {
						url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
					}
				})
				mapInstanceRef.current.societyMarkers.push(marker)
				mapInstanceRef.current.boundaryPolygons.push(marker)
				allBounds.extend({ lat: society.latitude, lng: society.longitude })
			}
		})
		
		// Fit map to show all societies
		if (selectedSocieties.length > 0) {
			mapInstanceRef.current.fitBounds(allBounds)
			// Add padding for better view
			const padding = 100
			mapInstanceRef.current.fitBounds(allBounds, padding)
		}
	}

	function removeSociety(index: number) {
		const societyToRemove = selectedSocieties[index]
		setSelectedSocieties(selectedSocieties.filter((_, i) => i !== index))
		
		// Remove from map if it exists
		if (mapInstanceRef.current && mapInstanceRef.current.societyBoundaries && mapInstanceRef.current.societyBoundaries[index]) {
			mapInstanceRef.current.societyBoundaries[index].setMap(null)
		}
		if (mapInstanceRef.current && mapInstanceRef.current.societyMarkers && mapInstanceRef.current.societyMarkers[index]) {
			mapInstanceRef.current.societyMarkers[index].setMap(null)
		}
		
		// Redraw remaining boundaries
		setTimeout(() => {
			drawSocietyBoundaries()
		}, 100)
	}

	async function loadAreas() {
		setLoading(true)
		try {
			const res = await fetch('/api/delivery-areas', { cache: 'no-store' })
			const json = await res.json()
			if (json.success) {
				setAreas(json.data || [])
			}
		} catch (err) {
			toast.error('Failed to load delivery areas')
		} finally {
			setLoading(false)
		}
	}

	async function saveArea() {
		if (!selectedCity) {
			toast.error('Please select a city by clicking on the map')
			return
		}
		
		if (selectedSocieties.length === 0) {
			toast.error('Please add at least one society by clicking on the map')
			return
		}

		try {
			const areaData: DeliveryArea = {
				...newArea,
				city: selectedCity.name,
				deliveryType: 'city',
				deliveryRadius: 0,
				deliveryAreas: selectedSocieties,
				shopLocation: {
					address: selectedCity.name,
					latitude: selectedCity.lat,
					longitude: selectedCity.lng
				}
			}
			
			const res = await fetch('/api/delivery-areas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(areaData)
			})
			const json = await res.json()
			if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save')
			toast.success('Delivery area saved successfully')
			resetForm()
			loadAreas()
		} catch (err: any) {
			toast.error(err.message || 'Failed to save delivery area')
		}
	}

	function resetForm() {
		setShowNewForm(false)
		setSelectedCity(null)
		setSelectedSocieties([])
		setMapMode('city')
		setNewArea({
			deliveryType: 'city',
			city: '',
			shopLocation: { address: '', latitude: 0, longitude: 0 },
			deliveryRadius: 0,
			deliveryAreas: [],
			isActive: true,
			displayOrder: 0
		})
		if (mapInstanceRef.current) {
			if (mapInstanceRef.current.cityMarker) {
				mapInstanceRef.current.cityMarker.setMap(null)
			}
			if (mapInstanceRef.current.boundaryPolygons) {
				mapInstanceRef.current.boundaryPolygons.forEach((polygon: any) => polygon.setMap(null))
			}
			mapInstanceRef.current.setCenter({ lat: 30.3753, lng: 69.3451 })
			mapInstanceRef.current.setZoom(6)
		}
		if (searchInputRef.current) {
			searchInputRef.current.value = ''
		}
	}

	async function deleteArea(id: string) {
		if (!confirm('Delete this delivery area?')) return
		try {
			const res = await fetch(`/api/delivery-areas?id=${id}`, { method: 'DELETE' })
			const json = await res.json()
			if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete')
			toast.success('Delivery area deleted')
			loadAreas()
		} catch (err: any) {
			toast.error(err.message || 'Failed to delete')
		}
	}

	if (loading) return <div className="container-pg py-8"><div className="animate-pulse space-y-4"><div className="h-10 bg-gray-200 rounded"></div></div></div>

	return (
		<div className="container-pg py-8">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-semibold">Delivery Areas Management</h1>
				<button
					onClick={() => setShowNewForm(true)}
					className="flex items-center gap-2 rounded-md bg-brand-accent px-4 py-2 text-white hover:opacity-90"
				>
					<Plus className="h-4 w-4" />
					Add Delivery Area
				</button>
			</div>

			{showNewForm && (
				<div className="mb-8 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
					<div className="bg-gradient-to-r from-brand-accent to-orange-500 px-6 py-4">
						<h2 className="text-xl font-semibold text-white">New Delivery Area</h2>
					</div>
					
					<div className="p-6 space-y-6">
						{/* Step 1: City Selection */}
						<div className="space-y-3">
							<label className="block text-sm font-semibold text-gray-700">
								Step 1: Select City *
							</label>
							<div className="max-w-2xl relative" ref={suggestionsRef}>
								<input
									ref={searchInputRef}
									type="text"
									value={citySearchQuery}
									onChange={(e) => {
										if (!selectedCity) {
											setCitySearchQuery(e.target.value)
											if (e.target.value.trim()) {
												setShowSuggestions(true)
											}
										}
									}}
									onFocus={() => {
										if (!selectedCity && searchSuggestions.length > 0) {
											setShowSuggestions(true)
										}
									}}
									placeholder="Search for a city in Pakistan (e.g., Lahore, Karachi)..."
									className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
									disabled={loadingSocietyDetails || !!selectedCity}
								/>
								{citySearchQuery && !selectedCity && (
									<button
										type="button"
										onClick={() => {
											setCitySearchQuery('')
											setSearchSuggestions([])
											setShowSuggestions(false)
										}}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								)}
								{showSuggestions && searchSuggestions.length > 0 && !selectedCity && (
									<div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
										{searchSuggestions.map((suggestion) => (
											<button
												key={suggestion.place_id}
												type="button"
												onClick={() => selectFromSuggestion(suggestion)}
												className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 flex items-start gap-3 transition-colors first:rounded-t-lg last:rounded-b-lg"
											>
												<MapPin className="h-5 w-5 text-brand-accent flex-shrink-0 mt-0.5" />
												<div className="flex-1">
													<div className="font-medium text-sm text-gray-900">{suggestion.main_text || suggestion.description.split(',')[0]}</div>
													{suggestion.secondary_text && (
														<div className="text-xs text-gray-500 mt-0.5">{suggestion.secondary_text}</div>
													)}
												</div>
											</button>
										))}
									</div>
								)}
							</div>
							{selectedCity && (
								<div className="max-w-2xl p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
									<Check className="h-5 w-5 text-green-600 flex-shrink-0" />
									<div className="flex-1">
										<span className="font-semibold text-green-900">Selected: {selectedCity.name}</span>
									</div>
									<button
										type="button"
										onClick={() => {
											setSelectedCity(null)
											setSelectedSocieties([])
											setMapMode('city')
											setCitySearchQuery('')
											setSocietySearchQuery('')
											if (mapInstanceRef.current) {
												if (mapInstanceRef.current.cityMarker) {
													mapInstanceRef.current.cityMarker.setMap(null)
												}
												if (mapInstanceRef.current.cityBoundary) {
													mapInstanceRef.current.cityBoundary.setMap(null)
												}
											}
										}}
										className="text-green-700 hover:text-green-900 transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
							)}
							{mapMode === 'city' && !selectedCity && (
								<p className="text-sm text-gray-500 max-w-2xl">
									💡 Click anywhere on the map to select a city, or search above
								</p>
							)}
						</div>

						{/* Step 2: Society Selection - Appears after city is selected */}
						{selectedCity && (
							<div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
								<label className="block text-sm font-semibold text-gray-700">
									Step 2: Add Societies/Areas * (Search or click on map)
								</label>
								<div className="max-w-2xl relative" ref={suggestionsRef}>
									<input
										type="text"
										value={societySearchQuery}
										onChange={(e) => {
											setSocietySearchQuery(e.target.value)
											if (e.target.value.trim()) {
												setShowSuggestions(true)
											}
										}}
										onFocus={() => {
											if (searchSuggestions.length > 0) {
												setShowSuggestions(true)
											}
										}}
										placeholder={`Search for societies in ${selectedCity.name}... (e.g., DHA Phase 5, Model Town)`}
										className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all disabled:bg-gray-100"
										disabled={loadingSocietyDetails}
									/>
									{societySearchQuery && (
										<button
											type="button"
											onClick={() => {
												setSocietySearchQuery('')
												setSearchSuggestions([])
												setShowSuggestions(false)
											}}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
										>
											<X className="h-4 w-4" />
										</button>
									)}
									{showSuggestions && searchSuggestions.length > 0 && (
										<div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
											{searchSuggestions.map((suggestion) => (
												<button
													key={suggestion.place_id}
													type="button"
													onClick={() => selectFromSuggestion(suggestion)}
													className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 flex items-start gap-3 transition-colors first:rounded-t-lg last:rounded-b-lg"
												>
													<MapPin className="h-5 w-5 text-brand-accent flex-shrink-0 mt-0.5" />
													<div className="flex-1">
														<div className="font-medium text-sm text-gray-900">{suggestion.main_text || suggestion.description.split(',')[0]}</div>
														{suggestion.secondary_text && (
															<div className="text-xs text-gray-500 mt-0.5">{suggestion.secondary_text}</div>
														)}
													</div>
												</button>
											))}
										</div>
									)}
								</div>
								<p className="text-sm text-gray-500 max-w-2xl">
									💡 Click on societies/areas on the map to add them, or search above. Boundaries will be shown automatically.
								</p>
							</div>
						)}

						{/* Map */}
						<div className="space-y-3">
							<label className="block text-sm font-semibold text-gray-700">
								{mapMode === 'city' ? 'Step 2: Click on Map to Select City' : selectedCity ? 'Step 3: Click on Map to Add Societies' : 'Map'}
							</label>
							<div className="relative rounded-lg overflow-hidden border border-gray-300 shadow-sm">
								<div 
									ref={mapRef} 
									className="w-full h-[500px] bg-gray-100"
									style={{ minHeight: '500px', position: 'relative' }}
								/>
								{!mapLoaded && (
									<div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md z-10">
										<div className="text-center">
											<div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
											<p className="text-sm text-gray-600">Loading Google Maps...</p>
											<p className="text-xs text-gray-500 mt-1">Please wait...</p>
										</div>
									</div>
								)}
								{mapLoaded && window.google && !mapInstanceRef.current && (
									<div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md z-10">
										<div className="text-center">
											<p className="text-sm text-red-600 mb-2">Initializing map...</p>
											<button
												onClick={() => {
													if (mapRef.current && window.google) {
														initMap()
													}
												}}
												className="px-4 py-2 bg-brand-accent text-white rounded-md hover:opacity-90 text-sm"
											>
												Retry
											</button>
										</div>
									</div>
								)}
								{mapLoaded && !window.google && (
									<div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md z-10">
										<div className="text-center">
											<p className="text-sm text-red-600 mb-2">Google Maps API failed to load</p>
											<p className="text-xs text-gray-600">Check console for errors</p>
										</div>
									</div>
								)}
							</div>
							{loadingSocietyDetails && (
								<div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
									<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
									Loading location details...
								</div>
							)}
						</div>

						{/* Step 3: Selected Societies */}
						{selectedCity && (
							<div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
								<label className="block text-sm font-semibold text-gray-700">
									Selected Societies ({selectedSocieties.length})
								</label>
								{selectedSocieties.length > 0 ? (
									<div className="space-y-3 max-w-2xl">
										{selectedSocieties.map((society, idx) => (
											<div
												key={idx}
												className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow animate-in fade-in slide-in-from-left-4 duration-300 overflow-hidden"
												style={{ animationDelay: `${idx * 50}ms` }}
											>
												{/* Society Details Card - Google Maps Style */}
												<div className="p-4">
													<div className="flex items-start justify-between gap-3">
														<div className="flex-1">
															<h3 className="font-semibold text-lg text-gray-900 mb-1">{society.name}</h3>
															{society.address && (
																<p className="text-sm text-gray-600 mb-2">{society.address}</p>
															)}
															<div className="flex flex-wrap gap-2 text-xs">
																{society.bounds && (
																	<span className="px-2 py-1 bg-green-100 text-green-700 rounded">
																		✓ Boundaries: {society.bounds.northeast.lat.toFixed(4)}, {society.bounds.northeast.lng.toFixed(4)}
																	</span>
																)}
																{society.radius && society.radius > 0 && (
																	<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
																		Radius: {society.radius.toFixed(2)} km
																	</span>
																)}
																<span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
																	📍 {society.latitude.toFixed(6)}, {society.longitude.toFixed(6)}
																</span>
															</div>
														</div>
														<button
															type="button"
															onClick={() => removeSociety(idx)}
															className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors flex-shrink-0"
															title="Remove society"
														>
															<X className="h-5 w-5" />
														</button>
													</div>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="max-w-2xl p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
										No societies added yet. Search above or click on the map to add societies.
									</div>
								)}
							</div>
						)}

						{/* Additional Settings */}
						<div className="pt-4 border-t border-gray-200 space-y-4">
							<div className="max-w-2xl">
								<label className="block text-sm font-semibold text-gray-700 mb-2">Display Order</label>
								<input
									type="number"
									value={newArea.displayOrder}
									onChange={e => setNewArea({ ...newArea, displayOrder: Number(e.target.value) })}
									className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all"
									placeholder="0"
								/>
							</div>

							<div className="flex items-center gap-3">
								<input
									type="checkbox"
									checked={newArea.isActive}
									onChange={e => setNewArea({ ...newArea, isActive: e.target.checked })}
									id="new-active"
									className="w-4 h-4 text-brand-accent border-gray-300 rounded focus:ring-brand-accent"
								/>
								<label htmlFor="new-active" className="text-sm font-medium text-gray-700 cursor-pointer">Active</label>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex gap-3 pt-4 border-t border-gray-200">
							<button
								onClick={saveArea}
								disabled={!selectedCity || selectedSocieties.length === 0}
								className="flex items-center gap-2 rounded-lg bg-brand-accent px-6 py-3 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
							>
								<Save className="h-4 w-4" />
								Save Delivery Area
							</button>
							<button
								onClick={resetForm}
								className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Existing Areas List */}
			<div className="space-y-4">
				{areas.map((area) => (
					<div key={area._id} className="border rounded-lg p-6 bg-white">
						<div className="flex items-start justify-between mb-4">
							<div>
								<div className="flex items-center gap-2">
									<h3 className="text-lg font-medium">{area.city}</h3>
									<span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
										{area.deliveryAreas.length} {area.deliveryAreas.length === 1 ? 'society' : 'societies'}
									</span>
								</div>
								{area.deliveryAreas.length > 0 && (
									<div className="flex flex-wrap gap-2 mt-2">
										{area.deliveryAreas.map((society, idx) => (
											<div
												key={idx}
												className="px-2 py-1 bg-gray-100 rounded text-xs flex items-center gap-1"
											>
												{society.bounds && <MapPin className="h-3 w-3 text-green-600" />}
												{society.name}
											</div>
										))}
									</div>
								)}
							</div>
							<button
								onClick={() => area._id && deleteArea(area._id)}
								className="px-3 py-1.5 border border-red-300 text-red-600 rounded-md hover:bg-red-50 text-sm"
							>
								<Trash2 className="h-4 w-4 inline" />
							</button>
						</div>
					</div>
				))}
			</div>

			{areas.length === 0 && !showNewForm && (
				<div className="text-center py-12 text-slate-600">
					<p>No delivery areas configured. Click "Add Delivery Area" to get started.</p>
				</div>
			)}
		</div>
	)
}
