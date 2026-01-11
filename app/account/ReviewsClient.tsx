"use client"

import { useEffect, useState } from 'react'
import { Star, CheckCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ReviewsClient() {
	const [reviews, setReviews] = useState<any[]>([])
	const [orders, setOrders] = useState<any[]>([])
	const [reviewableProducts, setReviewableProducts] = useState<any[]>([])
	const [reviewProducts, setReviewProducts] = useState<Record<string, any>>({})
	const [loading, setLoading] = useState(true)
	const [showReviewForm, setShowReviewForm] = useState<{ productId: string; orderId: string; productTitle: string; productImage?: string; variantLabel?: string } | null>(null)
	const [formData, setFormData] = useState({ rating: 5, comment: '' })

	useEffect(() => {
		loadData()
	}, [])

	async function loadData() {
		setLoading(true)
		try {
			// Load user's reviews
			const reviewsRes = await fetch('/api/reviews?userId=current')
			const reviewsJson = await reviewsRes.json()
			let userReviews: any[] = []
			if (reviewsJson?.success && reviewsJson?.data) {
				userReviews = reviewsJson.data
				setReviews(userReviews)
				
				// Fetch product details for reviews
				const productDetailsMap: Record<string, any> = {}
				await Promise.all(
					userReviews.map(async (review: any) => {
						try {
							const productRes = await fetch(`/api/products/${review.productId}`)
							const productJson = await productRes.json()
							if (productJson?.success && productJson?.data) {
								productDetailsMap[review.productId] = productJson.data
							}
						} catch (error) {
							// Ignore errors
						}
					})
				)
				setReviewProducts(productDetailsMap)
			}

			// Load orders to show products that can be reviewed
			const ordersRes = await fetch('/api/orders')
			const ordersJson = await ordersRes.json()
			if (ordersJson?.success && ordersJson?.data) {
				setOrders(ordersJson.data)
				
				// Get products that can be reviewed (from shipped/delivered orders, not yet reviewed)
				// Only include orders that are SHIPPED or DELIVERED, and exclude CANCELLED orders
				const productsToReview = ordersJson.data
					.filter((order: any) => {
						const status = String(order.status || '').toUpperCase().trim()
						// Only allow reviews for orders that are SHIPPED or DELIVERED
						// For SHIPPED orders, also verify shippedAt exists
						// Exclude all other statuses explicitly
						if (status === 'SHIPPED') {
							return true // Allow if status is SHIPPED (shippedAt is optional but preferred)
						}
						if (status === 'DELIVERED') {
							return true // Allow if status is DELIVERED
						}
						// Explicitly exclude all other statuses
						return false
					})
					.flatMap((order: any) => 
						order.items?.map((item: any) => ({
							productId: item.productId,
							orderId: String(order._id),
							productTitle: item.title || 'Product',
							variantId: item.variantId,
							variantLabel: item.variantLabel,
							quantity: item.quantity,
							unitPrice: item.unitPrice
						})) || []
					).filter((product: any) => {
						// Check if already reviewed
						return !userReviews.some((r: any) => r.productId === product.productId)
					})

				// Fetch product details for each product
				const productsWithDetails = await Promise.all(
					productsToReview.map(async (product: any) => {
						try {
							const productRes = await fetch(`/api/products/${product.productId}`)
							const productJson = await productRes.json()
							if (productJson?.success && productJson?.data) {
								return {
									...product,
									productTitle: productJson.data.title || product.productTitle,
									productImage: productJson.data.images?.[0] || '',
									productSlug: productJson.data.slug || product.productId,
									brand: productJson.data.brand,
									category: productJson.data.category
								}
							}
							return product
						} catch (error) {
							return product
						}
					})
				)

				setReviewableProducts(productsWithDetails)
			}
		} catch (error) {
			toast.error('Failed to load reviews')
		} finally {
			setLoading(false)
		}
	}

	async function submitReview() {
		if (!showReviewForm) return

		try {
			const res = await fetch('/api/reviews', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					productId: showReviewForm.productId,
					orderId: showReviewForm.orderId,
					rating: formData.rating,
					comment: formData.comment
				})
			})

			const json = await res.json()
			if (!res.ok || !json.success) {
				throw new Error(json.message || 'Failed to submit review')
			}

			toast.success('Review submitted successfully!')
			setShowReviewForm(null)
			setFormData({ rating: 5, comment: '' })
			loadData()
		} catch (error: any) {
			toast.error(error.message || 'Failed to submit review')
		}
	}

	async function deleteReview(reviewId: string) {
		if (!confirm('Are you sure you want to delete this review?')) return

		try {
			const res = await fetch(`/api/reviews?reviewId=${reviewId}`, {
				method: 'DELETE'
			})

			const json = await res.json()
			if (!res.ok || !json.success) {
				throw new Error(json.message || 'Failed to delete review')
			}

			toast.success('Review deleted')
			loadData()
		} catch (error: any) {
			toast.error(error.message || 'Failed to delete review')
		}
	}

	if (loading) return <div className="skeleton h-32" />

	return (
		<div className="space-y-6">
			{/* Products to Review */}
			{reviewableProducts.length > 0 && (
				<div>
					<h2 className="text-lg font-semibold mb-4">Products to Review</h2>
					<div className="space-y-3">
						{reviewableProducts.map((product: any, idx: number) => (
							<div key={idx} className="rounded-md border p-4 hover:shadow-sm transition-shadow">
								<div className="flex items-start gap-4">
									{/* Product Image */}
									{product.productImage && (
										<Link href={`/products/${product.productSlug || product.productId}` as any}>
											<div className="h-20 w-20 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
												<img 
													src={product.productImage} 
													alt={product.productTitle}
													className="h-full w-full object-cover"
												/>
											</div>
										</Link>
									)}
									
									{/* Product Details */}
									<div className="flex-1 min-w-0">
										<Link 
											href={`/products/${product.productSlug || product.productId}`}
											className="block"
										>
											<h3 className="font-medium text-gray-900 hover:text-brand-accent transition-colors">
												{product.productTitle}
											</h3>
										</Link>
										{product.variantLabel && (
											<p className="text-sm text-gray-600 mt-0.5">{product.variantLabel}</p>
										)}
										{product.brand && (
											<p className="text-xs text-gray-500 mt-0.5">Brand: {product.brand}</p>
										)}
										<div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
											<span>Order #{String(product.orderId).slice(-6)}</span>
											{product.quantity && (
												<span>Qty: {product.quantity}</span>
											)}
											{product.unitPrice && (
												<span>Price: Rs. {product.unitPrice}</span>
											)}
										</div>
									</div>
									
									{/* Write Review Button */}
									<button
										onClick={() => setShowReviewForm(product)}
										className="btn-primary text-sm whitespace-nowrap flex-shrink-0"
									>
										Write Review
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Review Form Modal */}
			{showReviewForm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
						<h3 className="text-lg font-semibold mb-4">Write a Review</h3>
						
						{/* Product Info in Modal */}
						<div className="flex items-start gap-3 mb-4 p-3 bg-gray-50 rounded-md">
							{showReviewForm.productImage && (
								<div className="h-16 w-16 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
									<img 
										src={showReviewForm.productImage} 
										alt={showReviewForm.productTitle}
										className="h-full w-full object-cover"
									/>
								</div>
							)}
							<div className="flex-1 min-w-0">
								<h4 className="font-medium text-gray-900">{showReviewForm.productTitle}</h4>
								{showReviewForm.variantLabel && (
									<p className="text-sm text-gray-600 mt-0.5">{showReviewForm.variantLabel}</p>
								)}
							</div>
						</div>
						
						<div className="mb-4">
							<label className="text-sm font-medium text-gray-700 mb-1.5 block">Rating</label>
							<div className="flex gap-1">
								{[1, 2, 3, 4, 5].map((star) => (
									<button
										key={star}
										type="button"
										onClick={() => setFormData({ ...formData, rating: star })}
										className="focus:outline-none"
									>
										<Star
											className={`h-6 w-6 ${
												star <= formData.rating
													? 'text-yellow-400 fill-yellow-400'
													: 'text-gray-300'
											}`}
										/>
									</button>
								))}
							</div>
						</div>

						<div className="mb-4">
							<label className="text-sm font-medium text-gray-700 mb-1.5 block">Comment</label>
							<textarea
								value={formData.comment}
								onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
								className="input-enhanced"
								rows={4}
								placeholder="Share your experience..."
							/>
						</div>

						<div className="flex gap-3">
							<button
								onClick={() => {
									setShowReviewForm(null)
									setFormData({ rating: 5, comment: '' })
								}}
								className="btn-secondary flex-1"
							>
								Cancel
							</button>
							<button
								onClick={submitReview}
								className="btn-primary flex-1"
							>
								Submit Review
							</button>
						</div>
					</div>
				</div>
			)}

			{/* My Reviews */}
			<div>
				<h2 className="text-lg font-semibold mb-4">My Reviews</h2>
				{reviews.length === 0 ? (
					<div className="text-sm text-gray-600">You haven't written any reviews yet.</div>
				) : (
					<div className="space-y-4">
						{reviews.map((review) => {
							const productDetails = reviewProducts[review.productId]
							
							return (
								<div key={String(review._id)} className="rounded-md border p-4 hover:shadow-sm transition-shadow">
									<div className="flex items-start gap-4">
										{/* Product Image */}
										{productDetails?.images?.[0] && (
											<Link href={`/products/${productDetails.slug || review.productId}` as any}>
												<div className="h-16 w-16 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
													<img 
														src={productDetails.images[0]} 
														alt={productDetails.title}
														className="h-full w-full object-cover"
													/>
												</div>
											</Link>
										)}
										
										{/* Review Content */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-2">
												<Link
													href={`/products/${productDetails?.slug || review.productId}`}
													className="font-medium text-gray-900 hover:text-brand-accent transition-colors"
												>
													{productDetails?.title || 'View Product'}
												</Link>
												{review.verifiedPurchase && (
													<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
														<CheckCircle className="h-3 w-3" />
														Verified Purchase
													</span>
												)}
											</div>
											<div className="flex items-center gap-1 mb-2">
												{[1, 2, 3, 4, 5].map((star) => (
													<Star
														key={star}
														className={`h-4 w-4 ${
															star <= review.rating
																? 'text-yellow-400 fill-yellow-400'
																: 'text-gray-300'
														}`}
													/>
												))}
											</div>
											{review.comment && (
												<p className="text-sm text-gray-700 mb-2">{review.comment}</p>
											)}
											<p className="text-xs text-gray-500">
												{new Date(review.createdAt).toLocaleDateString()}
											</p>
										</div>
										<button
											onClick={() => deleteReview(String(review._id))}
											className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								</div>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
