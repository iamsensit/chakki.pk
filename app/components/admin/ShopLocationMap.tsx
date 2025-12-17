"use client"

import { useEffect, useRef, useState } from 'react'
import { reverseGeocode, geocodeAddress, searchLocalities } from '@/app/lib/geocoding'
import { Search } from 'lucide-react'

interface ShopLocationMapProps {
	latitude: number
	longitude: number
	onLocationChange: (lat: number, lon: number, address: string, city?: string) => void
	mapId: string
	showSearch?: boolean
}

export default function ShopLocationMap({ latitude, longitude, onLocationChange, mapId, showSearch = false }: ShopLocationMapProps) {
	const mapRef = useRef<HTMLDivElement>(null)
	const mapInstanceRef = useRef<any>(null)
	const markerInstanceRef = useRef<any>(null)
	const [map, setMap] = useState<any>(null)
	const [marker, setMarker] = useState<any>(null)
	const [mapLoaded, setMapLoaded] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [searchResults, setSearchResults] = useState<Array<{ lat: number; lon: number; display_name: string; city?: string }>>([])
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const searchContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (typeof window === 'undefined' || mapInstanceRef.current) return // Don't reinitialize if map exists

		// Load Leaflet if not already loaded
		if (!window.L) {
			if (document.querySelector('link[href*="leaflet"]')) {
				// Already loading, wait for it
				const checkInterval = setInterval(() => {
					if (window.L && !mapInstanceRef.current) {
						clearInterval(checkInterval)
						initMap()
					}
				}, 100)
				return () => clearInterval(checkInterval)
			}

			const link = document.createElement('link')
			link.rel = 'stylesheet'
			link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
			link.crossOrigin = ''
			document.head.appendChild(link)

			const script = document.createElement('script')
			script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
			script.crossOrigin = ''
			script.onload = () => {
				setTimeout(() => {
					if (!mapInstanceRef.current) initMap()
				}, 100)
			}
			document.body.appendChild(script)
		} else {
			if (!mapInstanceRef.current) initMap()
		}

		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current)
			}
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove()
				mapInstanceRef.current = null
				markerInstanceRef.current = null
				setMap(null)
				setMarker(null)
			}
		}
	}, [])

	useEffect(() => {
		if (mapInstanceRef.current && markerInstanceRef.current && latitude && longitude) {
			markerInstanceRef.current.setLatLng([latitude, longitude])
			mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom() < 10 ? 13 : mapInstanceRef.current.getZoom())
		}
	}, [latitude, longitude])

	function initMap() {
		if (!mapRef.current || typeof window === 'undefined' || !window.L || mapInstanceRef.current) return
		
		// Check if the container already has a map instance (Leaflet stores this)
		if ((mapRef.current as any)._leaflet_id) {
			return // Container already has a map, don't reinitialize
		}

		// Default to Lahore if no coordinates
		const defaultLat = latitude || 31.5204
		const defaultLon = longitude || 74.3587

		const leafletMap = window.L.map(mapRef.current).setView([defaultLat, defaultLon], 13)
		mapInstanceRef.current = leafletMap

		// Restrict map bounds to Pakistan
		// Pakistan approximate bounds: North: 37.0, South: 23.6, East: 77.8, West: 60.8
		const pakistanBounds = window.L.latLngBounds(
			[23.6, 60.8], // Southwest corner
			[37.0, 77.8]  // Northeast corner
		)
		leafletMap.setMaxBounds(pakistanBounds)
		leafletMap.setMinZoom(6) // Prevent zooming out too far
		leafletMap.setMaxZoom(18)

		window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors'
		}).addTo(leafletMap)
		
		// Prevent panning outside Pakistan
		leafletMap.on('drag', () => {
			leafletMap.panInsideBounds(pakistanBounds, { animate: false })
		})

		// Add initial marker if coordinates exist
		let initialMarker: any = null
		if (latitude && longitude) {
			initialMarker = window.L.marker([latitude, longitude], {
				icon: window.L.icon({
					iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
					iconSize: [25, 41],
					iconAnchor: [12, 41]
				})
			}).addTo(leafletMap)
			markerInstanceRef.current = initialMarker
		}

		// Add click handler
		leafletMap.on('click', async (e: any) => {
			const clickedLat = e.latlng.lat
			const clickedLon = e.latlng.lng

			// Update or create marker
			if (markerInstanceRef.current) {
				markerInstanceRef.current.setLatLng([clickedLat, clickedLon])
			} else {
				initialMarker = window.L.marker([clickedLat, clickedLon], {
					icon: window.L.icon({
						iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
						iconSize: [25, 41],
						iconAnchor: [12, 41]
					})
				}).addTo(leafletMap)
				markerInstanceRef.current = initialMarker
			}

			// Reverse geocode to get address
			const result = await reverseGeocode(clickedLat, clickedLon)
			if (result) {
				onLocationChange(clickedLat, clickedLon, result.display_name, result.city)
			}
		})

		setMap(leafletMap)
		setMarker(markerInstanceRef.current)
		setMapLoaded(true)
	}

	// Close search dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
				setSearchResults([])
			}
		}
		
		if (searchResults.length > 0) {
			document.addEventListener('mousedown', handleClickOutside)
			return () => {
				document.removeEventListener('mousedown', handleClickOutside)
			}
		}
	}, [searchResults.length])

	async function handleSearch() {
		if (!searchQuery.trim()) {
			setSearchResults([])
			return
		}
		
		try {
			const results = await searchLocalities(searchQuery)
			// Filter to Pakistan only (double check)
			const pakistanResults = results.filter(r => {
				// Pakistan lat range: 23.6 to 37.0, lon range: 60.8 to 77.8
				return r.lat >= 23.6 && r.lat <= 37.0 && r.lon >= 60.8 && r.lon <= 77.8
			})
			setSearchResults(pakistanResults)
		} catch (err) {
			console.error('Search error:', err)
			setSearchResults([])
		}
	}

	function selectSearchResult(result: { lat: number; lon: number; display_name: string; city?: string }) {
		// Close dropdown immediately
		setSearchQuery('')
		setSearchResults([])
		
		if (mapInstanceRef.current) {
			if (markerInstanceRef.current) {
				markerInstanceRef.current.setLatLng([result.lat, result.lon])
			} else {
				const newMarker = window.L.marker([result.lat, result.lon], {
					icon: window.L.icon({
						iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
						iconSize: [25, 41],
						iconAnchor: [12, 41]
					})
				}).addTo(mapInstanceRef.current)
				markerInstanceRef.current = newMarker
			}
			mapInstanceRef.current.setView([result.lat, result.lon], 15)
			
			// Use city from search result if available, otherwise reverse geocode
			if (result.city) {
				onLocationChange(result.lat, result.lon, result.display_name, result.city)
			} else {
				reverseGeocode(result.lat, result.lon).then(geocodeResult => {
					if (geocodeResult) {
						onLocationChange(result.lat, result.lon, geocodeResult.display_name, geocodeResult.city)
					}
				})
			}
		}
	}

	return (
		<div>
			{showSearch && (
				<div className="mb-3" ref={searchContainerRef}>
					<div className="relative">
						<input
							type="text"
							value={searchQuery}
							onChange={e => {
								setSearchQuery(e.target.value)
								// Clear previous timeout
								if (searchTimeoutRef.current) {
									clearTimeout(searchTimeoutRef.current)
								}
								// Debounce search - wait 500ms after user stops typing
								if (e.target.value.trim()) {
									searchTimeoutRef.current = setTimeout(() => {
										handleSearch()
									}, 500)
								} else {
									setSearchResults([])
								}
							}}
							onKeyDown={e => {
								if (e.key === 'Enter') {
									e.preventDefault()
									if (searchTimeoutRef.current) {
										clearTimeout(searchTimeoutRef.current)
									}
									handleSearch()
								}
							}}
							placeholder="Search for location in Pakistan..."
							className="w-full rounded-md border px-3 py-2 pr-10 text-sm"
						/>
						<button
							onClick={() => {
								if (searchTimeoutRef.current) {
									clearTimeout(searchTimeoutRef.current)
								}
								handleSearch()
							}}
							className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
						>
							<Search className="h-4 w-4 text-gray-600" />
						</button>
					</div>
					{searchResults.length > 0 && (
						<div className="mt-2 border rounded-md bg-white shadow-lg max-h-60 overflow-y-auto z-20 relative">
							{searchResults.map((result, idx) => (
								<button
									key={idx}
									onClick={() => selectSearchResult(result)}
									className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0 transition-colors"
								>
									{result.display_name}
								</button>
							))}
						</div>
					)}
				</div>
			)}
			<div
				ref={mapRef}
				id={`shop-location-map-${mapId}`}
				className="w-full h-64 rounded-md border border-gray-300"
				style={{ zIndex: 1 }}
			/>
			<div className="mt-2 text-xs text-slate-500">
				{showSearch ? 'Search for location or click on the map to select shop location' : 'Click on the map to select shop location'}
			</div>
		</div>
	)
}

// Extend Window interface for Leaflet
declare global {
	interface Window {
		L: any
	}
}

