import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

/**
 * Shared product reviews hook using SWR for caching
 * This prevents multiple product cards from making duplicate review API calls
 */
export function useProductReviews(productId: string | null | undefined) {
	const { data, error, isLoading } = useSWR(
		productId ? `/api/reviews?productId=${productId}` : null,
		fetcher,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			dedupingInterval: 10000, // Dedupe requests within 10 seconds
			refreshInterval: 0, // Don't auto-refresh
		}
	)

	const reviewData = data?.success ? data.data : null

	return {
		reviewData,
		isLoading,
		error,
		totalReviews: reviewData?.totalReviews || 0,
		averageRating: reviewData?.averageRating || 0,
	}
}

