"use client"

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useCartStore } from '@/store/cart'

export default function CartSync() {
	const { status } = useSession()
	const hasSyncedRef = useRef(false)
	const syncingRef = useRef(false)

	useEffect(() => {
		async function sync() {
			// Prevent multiple simultaneous syncs
			if (syncingRef.current) {
				console.log('[CartSync] Already syncing, skipping...')
				return
			}
			
			// Only sync when authenticated - don't clear cart for guest users
			if (status === 'authenticated') {
				// Only sync once per session to prevent duplicate additions
				if (hasSyncedRef.current) {
					console.log('[CartSync] Already synced this session, skipping...')
					// Still fetch server cart to keep in sync, but don't save local items again
					try {
						const res = await fetch('/api/cart', { cache: 'no-store' })
						if (res.ok) {
							const json = await res.json()
							const serverItems = Array.isArray(json?.data?.items) ? json.data.items : []
							if (serverItems.length > 0) {
								useCartStore.getState().setAll(serverItems.map((i: any) => ({
									productId: i.productId,
									variantId: i.variantId,
									title: i.title,
									variantLabel: i.variantLabel,
									image: i.image,
									quantity: i.quantity,
									unitPrice: i.unitPrice
								})))
							}
						}
					} catch (err) {
						console.error('[CartSync] Error fetching cart:', err)
					}
					return
				}
				
				syncingRef.current = true
				try {
					// First, fetch server cart to see what's already there
					const serverRes = await fetch('/api/cart', { cache: 'no-store' })
					let serverItems: any[] = []
					if (serverRes.ok) {
						const serverJson = await serverRes.json()
						serverItems = Array.isArray(serverJson?.data?.items) ? serverJson.data.items : []
					}
					
					// Get local cart items
					const localItems = useCartStore.getState().items
					
					// Only save local items that don't exist on server (to avoid duplicates)
					if (localItems.length > 0) {
						console.log('[CartSync] Checking', localItems.length, 'local cart items against server')
						
						for (const item of localItems) {
							// Check if this item already exists on server
							const existsOnServer = serverItems.some((si: any) => 
								si.productId === item.productId && 
								String(si.variantId || '') === String(item.variantId || '')
							)
							
							if (!existsOnServer) {
								// Item doesn't exist on server, add it
								console.log('[CartSync] Adding new item to server:', item.title)
								try {
									await fetch('/api/cart', {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify({
											productId: item.productId,
											variantId: item.variantId,
											quantity: item.quantity
										})
									})
								} catch (err) {
									console.error('[CartSync] Error saving item to server:', err)
								}
							} else {
								console.log('[CartSync] Item already on server, skipping:', item.title)
							}
						}
					}
					
					// Fetch updated server cart
					const res = await fetch('/api/cart', { cache: 'no-store' })
					if (res.ok) {
						const json = await res.json()
						const finalServerItems = Array.isArray(json?.data?.items) ? json.data.items : []
						
						if (finalServerItems.length > 0) {
							// Use server cart
							useCartStore.getState().setAll(finalServerItems.map((i: any) => ({
								productId: i.productId,
								variantId: i.variantId,
								title: i.title,
								variantLabel: i.variantLabel,
								image: i.image,
								quantity: i.quantity,
								unitPrice: i.unitPrice
							})))
							console.log('[CartSync] Synced', finalServerItems.length, 'items from server')
						} else if (localItems.length > 0) {
							// Server cart is empty but we have local items - keep local items
							console.log('[CartSync] Server cart is empty, keeping local cart items')
						}
					} else {
						// Server error - keep local cart
						console.log('[CartSync] Server error, keeping local cart items')
					}
					
					// Mark as synced
					hasSyncedRef.current = true
				} catch (err) {
					console.error('[CartSync] Error syncing cart:', err)
					// Don't clear cart on error - keep local cart items
				} finally {
					syncingRef.current = false
				}
			}
			// Don't clear cart when unauthenticated - allow guest users to keep their cart
		}
		
		// Reset sync flag when user logs out
		if (status === 'unauthenticated') {
			hasSyncedRef.current = false
		}
		
		// Only sync if status is determined (not 'loading')
		// Defer to avoid blocking navigation - increase delay to ensure it runs after LocationSync
		if (status !== 'loading') {
			const timeout = setTimeout(() => {
				sync()
			}, 300) // Increased delay to ensure LocationSync completes first
			return () => clearTimeout(timeout)
		}
	}, [status])

	return null
}



