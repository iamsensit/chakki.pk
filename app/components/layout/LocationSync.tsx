"use client"

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function LocationSync() {
	const { data: session, status } = useSession()

	useEffect(() => {
		async function syncLocation() {
			// Only sync when authenticated
			if (status === 'authenticated' && session?.user?.email) {
				try {
					// Check if there's a guest location in localStorage
					const savedLocation = localStorage.getItem('deliveryLocation')
					if (savedLocation) {
						try {
							const location = JSON.parse(savedLocation)
							// If it's a guest location (no userEmail) or belongs to a different user, save it to DB
							if (location.address && location.latitude && location.longitude) {
								// Check if location belongs to current user
								const belongsToCurrentUser = location.userEmail === session.user.email
								
								if (!belongsToCurrentUser) {
									// This is a guest location or belongs to another user - save it for current user
									console.log('[LocationSync] Saving guest location to database for user:', session.user.email)
									const res = await fetch('/api/user-delivery-location', {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify({
											address: location.address,
											latitude: location.latitude,
											longitude: location.longitude,
											city: location.city || ''
										})
									})
									
									const json = await res.json()
									if (json.success) {
										console.log('[LocationSync] Location saved successfully to database')
										// Update localStorage with current user's email
										const updatedLocation = { 
											...location, 
											userEmail: session.user.email,
											city: json.data?.city || location.city,
											address: json.data?.address || location.address,
											latitude: json.data?.latitude || location.latitude,
											longitude: json.data?.longitude || location.longitude
										}
										localStorage.setItem('deliveryLocation', JSON.stringify(updatedLocation))
										localStorage.setItem('deliveryCity', updatedLocation.city || '')
										
										// Dispatch event to update header
										if (typeof window !== 'undefined') {
											window.dispatchEvent(new CustomEvent('deliveryLocationUpdated', { detail: updatedLocation }))
										}
									} else {
										console.error('[LocationSync] Failed to save location:', json.message)
									}
								} else {
									// Location already belongs to current user, just ensure it's synced
									// Fetch from server to make sure we have the latest
									const res = await fetch('/api/user-delivery-location', { cache: 'no-store' })
									const json = await res.json()
									if (json.success && json.data) {
										// Update localStorage with server data
										const serverLocation = {
											address: json.data.address,
											latitude: json.data.latitude,
											longitude: json.data.longitude,
											city: json.data.city,
											userEmail: session.user.email
										}
										localStorage.setItem('deliveryLocation', JSON.stringify(serverLocation))
										localStorage.setItem('deliveryCity', serverLocation.city || '')
										
										// Dispatch event to update header
										if (typeof window !== 'undefined') {
											window.dispatchEvent(new CustomEvent('deliveryLocationUpdated', { detail: serverLocation }))
										}
									}
								}
							}
						} catch (parseError) {
							console.error('[LocationSync] Error parsing location from localStorage:', parseError)
						}
					} else {
						// No location in localStorage - try to fetch from server
						const res = await fetch('/api/user-delivery-location', { cache: 'no-store' })
						const json = await res.json()
						if (json.success && json.data) {
							// Save server location to localStorage
							const serverLocation = {
								address: json.data.address,
								latitude: json.data.latitude,
								longitude: json.data.longitude,
								city: json.data.city,
								userEmail: session.user.email
							}
							localStorage.setItem('deliveryLocation', JSON.stringify(serverLocation))
							localStorage.setItem('deliveryCity', serverLocation.city || '')
							
							// Dispatch event to update header
							if (typeof window !== 'undefined') {
								window.dispatchEvent(new CustomEvent('deliveryLocationUpdated', { detail: serverLocation }))
							}
						}
					}
				} catch (err) {
					console.error('[LocationSync] Error syncing location:', err)
				}
			}
		}
		
		// Only sync if status is determined (not 'loading')
		// Run immediately to save guest location before Header clears it
		if (status !== 'loading') {
			syncLocation()
		}
	}, [status, session])

	return null
}

