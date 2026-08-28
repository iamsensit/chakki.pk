"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCartStore } from '@/store/cart'
import { useSession } from 'next-auth/react'
import { ShoppingCart, Star, Heart, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useWishlist } from '@/app/hooks/useWishlist'
import { useProductReviews } from '@/app/hooks/useProductReviews'
import { motion } from 'framer-motion'

type Variant = { id?: string; _id?: string; label: string; unitWeight: number; pricePerKg: number; unit?: string; stockQty?: number }

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
	const [isAdding, setIsAdding] = useState(false)
	const [isJustAdded, setIsJustAdded] = useState(false)
	const variant = variants?.[0]
	const unitPrice = variant?.pricePerKg ? Math.round(variant.pricePerKg * variant.unitWeight) : 0
	const variantId = variant?.id || (variant as any)?._id

	const { isWishlisted, toggle: toggleWishlistHook } = useWishlist()
	const { reviewData, isLoading: reviewsLoading } = useProductReviews(id)
	const wishlisted = isWishlisted(id, variantId)
	
	// Parse discount from badges (e.g., "15% OFF" -> 15)
	let discountPercent = 0
	if (badges && Array.isArray(badges)) {
		for (const badge of badges) {
			if (typeof badge === 'string') {
				const match = badge.match(/(\d+)% OFF/i)
				if (match) {
					discountPercent = parseInt(match[1])
					break
				}
			}
		}
	}
	const originalPrice = discountPercent > 0 ? Math.round(unitPrice / (1 - discountPercent / 100)) : unitPrice
	
	// Weight display
	let displayWeight = variant?.unitWeight || 1
	const unit = variant?.unit || 'kg'
	if (unit === 'g' || unit === 'ml') {
		displayWeight = (variant?.unitWeight || 0) * 1000
	}
	const unitLabels: Record<string, string> = { kg: 'KG', g: 'g', l: 'L', ml: 'ml', pcs: 'pcs', pack: 'pack' }
	const unitLabel = unitLabels[unit] || unit
	const displayWeightStr = `${displayWeight} ${unitLabel}`

	const imgSrc = images?.[0] || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80'
	const lowStock = typeof variant?.stockQty === 'number' ? variant.stockQty : undefined

	async function handleAddToCart(e: React.MouseEvent) {
		e.preventDefault()
		e.stopPropagation()
		
		if (!variant) {
			toast.error('Product variant not available')
			return
		}

		setIsAdding(true)
		setIsJustAdded(true)
		
		add({
			productId: id,
			variantId: variantId ? String(variantId) : undefined,
			title: title,
			variantLabel: variant.label || displayWeightStr,
			image: imgSrc,
			quantity: 1,
			unitPrice
		})
		
		if (status === 'authenticated') {
			try {
				await fetch('/api/cart', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						productId: id,
						variantId: variantId ? String(variantId) : undefined,
						quantity: 1
					})
				})
			} catch (err: any) {
				console.error('Error syncing cart:', err.message)
			}
		}
		
		toast.success(`Added ${title} to cart`)
		setTimeout(() => setIsAdding(false), 300)
		setTimeout(() => setIsJustAdded(false), 1500)
	}
	
	const productHref = href || `/products/${id}`

	async function handleToggleWishlist(e: React.MouseEvent) {
		e.preventDefault()
		e.stopPropagation()

		const nextState = await toggleWishlistHook({
			productId: String(id),
			variantId: variantId ? String(variantId) : null,
			title: title,
			image: imgSrc
		})

		toast.success(nextState ? `Added ${title} to wishlist` : `Removed ${title} from wishlist`)
	}

	
	return (
		<div className="group relative flex flex-col justify-between bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-md hover:border-[#7EB338]/50 transition-all duration-300 overflow-hidden p-3.5">
			{/* Top Bar: Discount Badge & Wishlist Button */}
			<div className="flex items-center justify-between gap-1 mb-2 z-10">
				{discountPercent > 0 ? (
					<span className="px-2 py-0.5 rounded-full bg-[#F08C38] text-white text-[10px] font-bold tracking-wide shadow-xs">
						{discountPercent}% OFF
					</span>
				) : (
					<span className="px-2 py-0.5 rounded-full bg-[#7EB338]/10 text-[#7EB338] text-[10px] font-bold tracking-wide">
						FRESH
					</span>
				)}

				<button
					onClick={handleToggleWishlist}
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
			<Link href={productHref as any} prefetch={true} className="relative w-full h-36 sm:h-44 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden mb-3 group-hover:bg-[#F5EFE0]/40 transition-colors">
				{imgSrc.startsWith('data:') ? (
					<img
						src={imgSrc}
						alt={title}
						className="w-full h-full object-contain p-2 rounded-xl transform group-hover:scale-105 transition-transform duration-300"
						loading="lazy"
					/>
				) : (
					<Image
						src={imgSrc}
						alt={title}
						fill
						className="object-contain p-2 rounded-xl transform group-hover:scale-105 transition-transform duration-300"
						sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
					/>
				)}
			</Link>
			
			{/* Product Info */}
			<div className="flex-1 flex flex-col justify-between">
				<div>
					<div className="flex items-center justify-between text-[11px] font-medium text-[#718096] mb-1">
						<span className="px-1.5 py-0.2 rounded bg-slate-100 font-semibold text-[#2D3748]">
							{displayWeightStr}
						</span>
					</div>

					<Link href={productHref as any} prefetch={true}>
						<h3 className="text-sm font-bold text-[#2D3748] group-hover:text-[#7EB338] transition-colors line-clamp-2 mb-1.5" title={title}>
							{title}
						</h3>
					</Link>
					
					{/* Reviews */}
					<div className="flex items-center gap-1 mb-3">
						<div className="flex items-center text-amber-400">
							<Star className="h-3.5 w-3.5 fill-amber-400" />
						</div>
						<span className="text-xs font-bold text-[#2D3748]">
							{reviewData?.averageRating ? reviewData.averageRating.toFixed(1) : '4.8'}
						</span>
						<span className="text-[10px] text-[#718096]">
							({reviewData?.totalReviews || '12'})
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
						disabled={isAdding || (typeof lowStock === 'number' && lowStock <= 0)}
						className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 ${
							isJustAdded
								? 'bg-[#2D3748] text-white'
								: 'bg-[#7EB338] hover:bg-[#6fa02f] text-white hover:shadow-md'
						}`}
						aria-label={`Add ${title} to cart`}
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
