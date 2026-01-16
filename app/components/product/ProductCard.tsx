"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import { useSession } from 'next-auth/react'
import { ShoppingCart, Star, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useWishlist } from '@/app/hooks/useWishlist'
import { useProductReviews } from '@/app/hooks/useProductReviews'

type Variant = { id?: string; _id?: string; label: string; unitWeight: number; pricePerKg: number; unit?: string }

export default function ProductCard({
	id,
	title,
	description,
	badges,
	images,
	variants,
	href
}: {
	id: string
	title: string
	description: string
	badges: string[]
	images: string[]
	variants: Variant[]
	href?: string
}) {
	const { add } = useCartStore()
	const { status } = useSession()
	const [isHovering, setIsHovering] = useState(false)
	const variant = variants?.[0]
	const unitPrice = variant?.pricePerKg ? Math.round(variant.pricePerKg * variant.unitWeight) : 0
	const variantId = variant?.id || (variant as any)?._id

	// Use optimized hooks with SWR caching
	const { isWishlisted, mutate: mutateWishlist } = useWishlist()
	const { reviewData, isLoading: reviewsLoading } = useProductReviews(id)
	const wishlisted = isWishlisted(id, variantId)
	
	// Calculate original price (assume discount if badge exists)
	const discountPercent = badges?.[0] ? (typeof badges[0] === 'string' && badges[0].includes('%') ? parseInt(badges[0]) : 15) : 0
	const originalPrice = discountPercent > 0 ? Math.round(unitPrice / (1 - discountPercent / 100)) : unitPrice
	
	// Get weight/volume display
	let displayWeight = variant?.unitWeight || 0
	const unit = variant?.unit || 'kg'
	if (unit === 'g') {
		displayWeight = (variant?.unitWeight || 0) * 1000
	} else if (unit === 'ml') {
		displayWeight = (variant?.unitWeight || 0) * 1000
	}
	
	const unitLabels: Record<string, string> = { kg: 'kg', g: 'g', l: 'l', ml: 'ml', pcs: 'pcs', pack: 'pack' }
	const unitLabel = unitLabels[unit] || unit
	const displayWeightStr = `${displayWeight}${unitLabel}`

	const imgSrc = images?.[0] || ''
	const lowStock = typeof (variant as any)?.stockQty === 'number' ? (variant as any).stockQty : undefined

	async function handleAddToCart(e: React.MouseEvent) {
		e.preventDefault()
		e.stopPropagation()
		
		if (!variant) {
			toast.error('Product variant not available')
			return
		}
		
		add({
			productId: id,
			variantId: variantId ? String(variantId) : undefined,
			title: title,
			variantLabel: variant.label,
			image: imgSrc,
			quantity: 1,
			unitPrice
		})
		
		if (status === 'authenticated') {
			try {
				const res = await fetch('/api/cart', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						productId: id,
						variantId: variantId ? String(variantId) : undefined,
						quantity: 1
					})
				})
				if (!res.ok) {
					const json = await res.json().catch(() => ({}))
					console.error('Failed to sync cart to server:', json.message || 'Unknown error')
				}
			} catch (err: any) {
				console.error('Error syncing cart to server:', err.message)
			}
		}
		
		toast.success('Added to cart')
	}
	
	const productHref = href || `/products/${id}`

	async function toggleWishlist(e: React.MouseEvent) {
		e.preventDefault()
		e.stopPropagation()
		
		if (status !== 'authenticated') {
			// Preserve full URL including query params and hash
			const currentUrl = window.location.pathname + window.location.search + window.location.hash
			window.location.href = '/auth/login?callbackUrl=' + encodeURIComponent(currentUrl) as any
			return
		}

		const productId = id
		
		try {
			if (wishlisted) {
				// Remove from wishlist
				const res = await fetch('/api/wishlist', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ productId, variantId: variantId ? String(variantId) : null })
				})
				const json = await res.json()
				if (json.success) {
					mutateWishlist() // Refresh wishlist cache
					toast.success('Removed from wishlist')
				}
			} else {
				// Add to wishlist
				const res = await fetch('/api/wishlist', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ productId, variantId: variantId ? String(variantId) : null })
				})
				const json = await res.json()
				if (json.success) {
					mutateWishlist() // Refresh wishlist cache
					toast.success('Added to wishlist')
				}
			}
		} catch (error) {
			console.error('Wishlist error:', error)
		}
	}
	
	return (
		<div className="bg-white border border-gray-200 rounded overflow-hidden hover:shadow-md transition-shadow">
			{/* Product Image */}
			<Link href={productHref as any} prefetch={true}>
				<div 
					className="relative h-40 bg-white p-2 group"
					onMouseEnter={() => setIsHovering(true)}
					onMouseLeave={() => setIsHovering(false)}
				>
					{imgSrc ? (
						<img
							src={imgSrc}
							alt={title}
							className="w-full h-full object-cover rounded bg-gray-100"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center text-xs text-gray-400 rounded bg-gray-100">No image</div>
					)}
					{/* Discount Badge */}
					{discountPercent > 0 && (
						<span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded discount-badge">
							{discountPercent}% OFF
						</span>
					)}
					{/* Wishlist Heart Icon - Show on Hover */}
					<button
						onClick={toggleWishlist}
						className={`absolute top-3 left-3 p-2 rounded-full bg-white shadow-md transition-all ${
							isHovering ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
						} ${wishlisted ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}
						title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
					>
						<Heart className={`h-5 w-5 ${wishlisted ? 'fill-current' : ''}`} />
					</button>
				</div>
			</Link>
			
			{/* Product Info */}
			<div className="p-3">
				<Link href={productHref as any} prefetch={true}>
					<h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem] hover:text-brand-accent transition-colors">
						{title}
					</h3>
				</Link>
				<p className="text-xs text-gray-600 mb-2">{displayWeightStr}</p>
				
				{/* Reviews */}
				<div className="flex items-center gap-1 mb-2 min-h-[16px]">
					{reviewsLoading ? (
						<span className="text-xs text-transparent">Loading...</span>
					) : reviewData && reviewData.totalReviews > 0 ? (
						<>
							<div className="flex items-center gap-0.5">
								{[1, 2, 3, 4, 5].map((star) => (
									<Star
										key={star}
										className={`h-3 w-3 ${
											star <= Math.round(reviewData.averageRating)
												? 'text-yellow-400 fill-yellow-400'
												: 'text-gray-300'
										}`}
									/>
								))}
							</div>
							<span className="text-xs text-gray-600">
								({reviewData.averageRating.toFixed(1)}) {reviewData.totalReviews}
							</span>
						</>
					) : (
						<>
							<div className="flex items-center gap-0.5">
								{[1, 2, 3, 4, 5].map((star) => (
									<Star
										key={star}
										className="h-3 w-3 text-gray-300"
									/>
								))}
							</div>
							<span className="text-xs text-gray-400">(0)</span>
						</>
					)}
				</div>
				
				{/* Price */}
				<div className="flex items-center gap-2 mb-3">
					<span className="text-base font-bold text-brand-accent">Rs. {unitPrice}</span>
					{originalPrice > unitPrice && (
						<span className="text-xs text-gray-500 line-through">Rs. {originalPrice}</span>
					)}
				</div>
				
				{/* Add to Cart Button */}
				<button
					onClick={handleAddToCart}
					disabled={typeof lowStock === 'number' && lowStock <= 0}
					className="w-full bg-brand-accent hover:bg-brand text-white text-sm font-medium py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<ShoppingCart className="h-4 w-4" />
					ADD TO CART
				</button>
			</div>
		</div>
	)
}
