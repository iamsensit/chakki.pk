"use client"

import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { useWishlistStore } from '@/store/wishlist'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useWishlist() {
	const { status } = useSession()
	const isAuthenticated = status === 'authenticated'

	const { data, error, isLoading, mutate } = useSWR(
		isAuthenticated ? '/api/wishlist' : null,
		fetcher,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			dedupingInterval: 1000,
			refreshInterval: 0,
		}
	)

	const localWishlist = useWishlistStore()
	const serverProducts = data?.success && data.data?.products ? data.data.products : []

	const isWishlisted = (productId: string, variantId?: string | null) => {
		if (!productId) return false
		if (isAuthenticated) {
			return serverProducts.some((p: any) => 
				String(p.productId) === String(productId) &&
				(!variantId || String(p.variantId) === String(variantId))
			)
		}
		return localWishlist.contains(String(productId))
	}

	const toggle = async (product: { productId: string; variantId?: string | null; title: string; image?: string }): Promise<boolean> => {
		const currentlyLiked = isWishlisted(product.productId, product.variantId)
		
		if (isAuthenticated) {
			try {
				if (currentlyLiked) {
					// DELETE from server
					const params = new URLSearchParams()
					params.set('productId', String(product.productId))
					if (product.variantId) params.set('variantId', String(product.variantId))
					
					const res = await fetch(`/api/wishlist?${params.toString()}`, { method: 'DELETE' })
					if (res.ok) {
						await mutate()
						return false
					}
				} else {
					// POST to server
					const res = await fetch('/api/wishlist', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							productId: String(product.productId),
							variantId: product.variantId ? String(product.variantId) : null,
							action: 'add'
						})
					})
					if (res.ok) {
						await mutate()
						return true
					}
				}
			} catch (err) {
				console.error('Wishlist error:', err)
			}
		} else {
			// Guest local storage
			localWishlist.toggle({
				productId: String(product.productId),
				title: product.title,
				image: product.image
			})
			return !currentlyLiked
		}

		return currentlyLiked
	}

	return {
		wishlist: data?.data,
		products: isAuthenticated ? serverProducts : localWishlist.items,
		isWishlisted,
		toggle,
		isLoading: isLoading && isAuthenticated,
		error,
		mutate,
	}
}
