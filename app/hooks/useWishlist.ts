import useSWR from 'swr'
import { useSession } from 'next-auth/react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

/**
 * Shared wishlist hook using SWR for caching and deduplication
 * This prevents multiple product cards from making duplicate API calls
 */
export function useWishlist() {
	const { status } = useSession()
	const { data, error, isLoading, mutate } = useSWR(
		status === 'authenticated' ? '/api/wishlist' : null,
		fetcher,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			dedupingInterval: 5000, // Dedupe requests within 5 seconds
			refreshInterval: 0, // Don't auto-refresh
		}
	)

	const wishlist = data?.success ? data.data : null
	const products = wishlist?.products || []

	const isWishlisted = (productId: string, variantId?: string | null) => {
		if (!products || products.length === 0) return false
		return products.some((p: any) => 
			p.productId === String(productId) && 
			p.variantId === (variantId ? String(variantId) : null)
		)
	}

	return {
		wishlist,
		products,
		isWishlisted,
		isLoading: isLoading && status === 'authenticated',
		error,
		mutate, // For manual refresh after add/remove
	}
}

