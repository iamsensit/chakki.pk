"use client"

import { useState } from 'react'
import Image from 'next/image'
import { ShoppingCart, Star, Heart, Check } from 'lucide-react'
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
	const [isAdding, setIsAdding] = useState(false)
	const [isJustAdded, setIsJustAdded] = useState(false)
	
	const variant = product.variants?.[0]
	const unitPrice = variant?.pricePerKg ? Math.round(variant.pricePerKg * variant.unitWeight) : (product.price || 0)
	const variantId = variant?.id || (variant as any)?._id
	const productId = product._id || product.id

	const { isWishlisted, toggle: toggleWishlistHook } = useWishlist()
	const { reviewData } = useProductReviews(productId)
	const wishlisted = isWishlisted(String(productId), variantId)

	// Parse discount from badges (e.g., "10% OFF")
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

	// Weight display
	let displayWeight = variant?.unitWeight || 1
	const unit = variant?.unit || 'kg'
	if (unit === 'g' || unit === 'ml') {
		displayWeight = (variant?.unitWeight || 0) * 1000
	}
	const unitLabels: Record<string, string> = { kg: 'KG', g: 'g', l: 'L', ml: 'ml', pcs: 'pcs', pack: 'pack' }
	const unitLabel = unitLabels[unit] || unit
	const displayWeightStr = `${displayWeight} ${unitLabel}`

	async function handleAddToCart(e: React.MouseEvent) {
		e.preventDefault()
		e.stopPropagation()

		if (!productId) {
			toast.error('Product not available')
			return
		}

		setIsAdding(true)
		setIsJustAdded(true)
		
		add({
			productId: String(productId),
			variantId: variantId ? String(variantId) : undefined,
			title: product.title,
			variantLabel: variant?.label || `${displayWeightStr}`,
			image: product.images?.[0],
			quantity: 1,
			unitPrice: unitPrice || 100,
		})

		if (status === 'authenticated') {
			try {
				await fetch('/api/cart', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						productId: String(productId),
						variantId: variantId ? String(variantId) : undefined,
						quantity: 1,
					}),
				})
			} catch (err) {}
		}

		toast.success(`Added ${product.title} to cart`)
		setTimeout(() => setIsAdding(false), 300)
		setTimeout(() => setIsJustAdded(false), 1500)
	}

	async function toggleWishlist(e: React.MouseEvent) {
		e.preventDefault()
		e.stopPropagation()

		const nextState = await toggleWishlistHook({
			productId: String(productId),
			variantId: variantId ? String(variantId) : null,
			title: product.title,
			image: product.images?.[0]
		})

		toast.success(nextState ? `Added ${product.title} to wishlist` : `Removed ${product.title} from wishlist`)
	}


	const productHref = `/products/${product.slug || productId}`

	return (
		<div className="group relative flex flex-col justify-between bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-md hover:border-[#7EB338]/50 transition-all duration-300 overflow-hidden p-3.5 h-full">
			{/* Top Bar: Badges & Wishlist */}
			<div className="flex items-center justify-between gap-1 mb-2 z-10">
				{discountPercent > 0 ? (
					<span className="px-2 py-0.5 rounded-full bg-[#F08C38] text-white text-[10px] font-bold tracking-wide shadow-xs">
						{discountPercent}% OFF
					</span>
				) : (
					<span className="px-2 py-0.5 rounded-full bg-[#7EB338]/10 text-[#7EB338] text-[10px] font-bold tracking-wide">
						DEAL
					</span>
				)}

				<button
					onClick={toggleWishlist}
					className={`p-1.5 rounded-full transition-colors ${
						wishlisted
							? 'bg-rose-50 text-rose-500'
							: 'bg-slate-50 text-[#718096] hover:text-rose-500 hover:bg-rose-50'
					}`}
					aria-label="Wishlist"
				>
					<Heart className={`h-4 w-4 ${wishlisted ? 'fill-rose-500' : ''}`} />
				</button>
			</div>

			{/* Product Image */}
			<Link
				href={productHref as any}
				className="relative w-full h-36 sm:h-44 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden mb-3 group-hover:bg-[#F5EFE0]/40 transition-colors"
			>
				{product.images?.[0] ? (
					<Image
						src={product.images[0]}
						alt={product.title}
						fill
						className="object-contain p-2 rounded-xl transform group-hover:scale-105 transition-transform duration-300"
						sizes="(max-width: 768px) 50vw, 25vw"
					/>
				) : (
					<div className="text-xs text-[#718096]">No image</div>
				)}
			</Link>

			{/* Info & CTA */}
			<div className="flex-1 flex flex-col justify-between">
				<div>
					<div className="flex items-center justify-between text-[11px] font-medium text-[#718096] mb-1">
						<span className="px-1.5 py-0.2 rounded bg-slate-100 font-semibold text-[#2D3748]">
							{displayWeightStr}
						</span>
					</div>

					<Link href={productHref as any}>
						<h3 className="text-sm font-bold text-[#2D3748] group-hover:text-[#7EB338] transition-colors line-clamp-2 mb-1.5" title={product.title}>
							{product.title}
						</h3>
					</Link>

					{/* Reviews */}
					<div className="flex items-center gap-1 mb-3">
						<div className="flex items-center text-amber-400">
							<Star className="h-3.5 w-3.5 fill-amber-400" />
						</div>
						<span className="text-xs font-bold text-[#2D3748]">
							{reviewData?.averageRating ? reviewData.averageRating.toFixed(1) : '4.9'}
						</span>
						<span className="text-[10px] text-[#718096]">
							({reviewData?.totalReviews || '8'})
						</span>
					</div>
				</div>

				{/* Price & Add to Cart Button */}
				<div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
					<div className="flex flex-col">
						<span className="text-base font-extrabold text-[#2D3748]">Rs. {unitPrice.toLocaleString()}</span>
						{originalPrice > unitPrice && (
							<span className="text-[10px] text-[#718096] line-through -mt-0.5">Rs. {originalPrice.toLocaleString()}</span>
						)}
					</div>

					<motion.button
						whileTap={{ scale: 0.9 }}
						onClick={handleAddToCart}
						disabled={isAdding}
						className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 ${
							isJustAdded
								? 'bg-[#2D3748] text-white'
								: 'bg-[#7EB338] hover:bg-[#6fa02f] text-white hover:shadow-md'
						}`}
						aria-label={`Add ${product.title} to cart`}
					>
						{isJustAdded ? (
							<>
								<Check className="h-3.5 w-3.5 text-[#7EB338] stroke-[3]" />
								<span>Added</span>
							</>
						) : (
							<>
								<ShoppingCart className="h-3.5 w-3.5" />
								<span>Add</span>
							</>
						)}
					</motion.button>
				</div>
			</div>
		</div>
	)
}
