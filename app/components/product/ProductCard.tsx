"use client"

import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import { useSession } from 'next-auth/react'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

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
	const variant = variants?.[0]
	const unitPrice = variant?.pricePerKg ? Math.round(variant.pricePerKg * variant.unitWeight) : 0
	
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
	
	const variantId = variant?.id || (variant as any)?._id
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
	
	return (
		<div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
			{/* Product Image */}
			<Link href={productHref as any}>
				<div className="relative h-40 bg-white p-2">
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
						<span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
							{discountPercent}% OFF
						</span>
					)}
				</div>
			</Link>
			
			{/* Product Info */}
			<div className="p-3">
				<Link href={productHref as any}>
					<h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem] hover:text-brand-accent transition-colors">
						{title}
					</h3>
				</Link>
				<p className="text-xs text-gray-600 mb-2">{displayWeightStr}</p>
				
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
					className="w-full bg-brand-accent hover:bg-orange-600 text-white text-sm font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<ShoppingCart className="h-4 w-4" />
					ADD TO CART
				</button>
			</div>
		</div>
	)
}
