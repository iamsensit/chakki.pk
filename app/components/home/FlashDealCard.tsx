"use client"

import { useState } from 'react'
import Image from 'next/image'
import { ShoppingCart, Star, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCartStore } from '@/store/cart'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useWishlist } from '@/app/hooks/useWishlist'
import { useProductReviews } from '@/app/hooks/useProductReviews'

export default function FlashDealCard({ product }: { product: any }) {
	const { add } = useCartStore()
	const { status } = useSession()
	const [isHovering, setIsHovering] = useState(false)
	const variant = product.variants?.[0]
	const unitPrice = variant?.pricePerKg ? Math.round(variant.pricePerKg * variant.unitWeight) : 0
	const variantId = variant?.id || (variant as any)?._id
	const productId = product._id || product.id

	// Use optimized hooks with SWR caching
	const { isWishlisted, mutate: mutateWishlist } = useWishlist()
	const { reviewData, isLoading: reviewsLoading } = useProductReviews(productId)
	const wishlisted = isWishlisted(String(productId), variantId)
	
	// Parse discount from badges (e.g., "10% OFF" -> 10)
	let discountPercent = 0
	if (product.badges && Array.isArray(product.badges)) {
		for (const badge of product.badges) {
			if (typeof badge === 'string') {
				const match = badge.match(/(\d+)% OFF/i)
				if (match) {
					discountPercent = parseInt(match[1])
					break
				}
			}
		}
	}
	const originalPrice = discountPercent > 0 ? Math.round(unitPrice / (1 - discountPercent / 100)) : 0
	
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
	
	async function handleAddToCart(e: React.MouseEvent) {
		e.preventDefault()
		e.stopPropagation()
		
		if (!variant || !productId) {
			toast.error('Product variant not available')
			return
		}
		
		add({
			productId: String(productId),
			variantId: variantId ? String(variantId) : undefined,
			title: product.title,
			variantLabel: variant.label,
			image: product.images?.[0],
			quantity: 1,
			unitPrice
		})
		
		if (status === 'authenticated') {
			try {
				const res = await fetch('/api/cart', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						productId: String(productId),
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

	async function toggleWishlist(e: React.MouseEvent) {
		e.preventDefault()
		e.stopPropagation()
		
		if (status !== 'authenticated') {
			// Preserve full URL including query params and hash
			const currentUrl = window.location.pathname + window.location.search + window.location.hash
			window.location.href = '/auth/login?callbackUrl=' + encodeURIComponent(currentUrl) as any
			return
		}
		
		try {
			if (wishlisted) {
				// Remove from wishlist
				const res = await fetch('/api/wishlist', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ productId: String(productId), variantId: variantId ? String(variantId) : null })
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
					body: JSON.stringify({ productId: String(productId), variantId: variantId ? String(variantId) : null })
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
		<div 
			className="bg-white border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex-shrink-0"
			style={{ 
				width: '200px', 
				maxWidth: '200px',
				minWidth: '200px'
			}}
			data-product-id={product._id || product.id}
		>
			{/* Product Image */}
			<Link 
				href={`/products/${product.slug ?? (product.id ?? product._id)}`}
				prefetch={true}
			>
				<div 
					className="relative h-32 sm:h-40 bg-white p-1.5 sm:p-2 group"
					onMouseEnter={() => setIsHovering(true)}
					onMouseLeave={() => setIsHovering(false)}
				>
					{product.images?.[0] ? (
						product.images[0].startsWith('data:') ? (
							// Base64 images from database - use regular img with loading optimization
							<img
								src={product.images[0]}
								alt={product.title}
								className="w-full h-full object-cover rounded bg-gray-100"
								loading="lazy"
								decoding="async"
							/>
						) : (
							// External URLs - use Next.js Image for optimization
							<Image
								src={product.images[0]}
								alt={product.title}
								fill
								className="object-cover rounded bg-gray-100"
								sizes="200px"
								loading="lazy"
								quality={75}
							/>
						)
					) : (
						<div className="w-full h-full flex items-center justify-center text-[10px] sm:text-xs text-gray-400 rounded bg-gray-100">No image</div>
					)}
					{/* Discount Badge */}
					{discountPercent > 0 && (
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 200, damping: 15 }}
							className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10"
						>
							<span className="bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md shadow-lg border border-red-400/50">
								{discountPercent}% OFF
							</span>
						</motion.div>
					)}
					{/* Wishlist Heart Icon - Show on Hover */}
					<button
						onClick={toggleWishlist}
						className={`absolute top-2 left-2 sm:top-3 sm:left-3 p-1.5 sm:p-2 rounded-full bg-white shadow-md transition-all ${
							isHovering ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
						} ${wishlisted ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}
						title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
					>
						<Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${wishlisted ? 'fill-current' : ''}`} />
					</button>
				</div>
			</Link>
			
			{/* Product Info */}
			<div className="p-2 sm:p-3">
				<Link 
					href={`/products/${product.slug ?? (product.id ?? product._id)}`}
					prefetch={true}
				>
					<h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-0.5 sm:mb-1 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] hover:text-brand-accent transition-colors">
						{product.title}
					</h3>
				</Link>
				<p className="text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2">{displayWeightStr}</p>
				
				{/* Reviews */}
				<div className="flex items-center gap-1 mb-1 sm:mb-2 min-h-[14px] sm:min-h-[16px]">
					{reviewsLoading ? (
						// Show nothing while loading to avoid flicker
						<span className="text-[10px] sm:text-xs text-transparent">Loading...</span>
					) : reviewData && reviewData.totalReviews > 0 ? (
						<>
							<div className="flex items-center gap-0.5">
								{[1, 2, 3, 4, 5].map((star) => (
									<Star
										key={star}
										className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${
											star <= Math.round(reviewData.averageRating)
												? 'text-yellow-400 fill-yellow-400'
												: 'text-gray-300'
										}`}
									/>
								))}
							</div>
							<span className="text-[10px] sm:text-xs text-gray-600">
								({reviewData.averageRating.toFixed(1)}) {reviewData.totalReviews}
							</span>
						</>
					) : (
						<>
							<div className="flex items-center gap-0.5">
								{[1, 2, 3, 4, 5].map((star) => (
									<Star
										key={star}
										className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-300"
									/>
								))}
							</div>
							<span className="text-[10px] sm:text-xs text-gray-400">(0)</span>
						</>
					)}
				</div>
				
				{/* Price */}
				<div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
					<span className="text-sm sm:text-base font-bold text-brand-accent">Rs. {unitPrice}</span>
					{originalPrice > unitPrice && (
						<span className="text-[10px] sm:text-xs text-gray-500 line-through">Rs. {originalPrice}</span>
					)}
				</div>
				
				{/* Add to Cart Button */}
				<button
					onClick={handleAddToCart}
					className="w-full bg-brand-accent hover:bg-brand text-white text-xs sm:text-sm font-medium py-1.5 sm:py-2 transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
				>
					<ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
					<span className="hidden xs:inline">ADD TO CART</span>
					<span className="xs:hidden">ADD</span>
				</button>
			</div>
		</div>
	)
}

