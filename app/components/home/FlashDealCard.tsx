"use client"

import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function FlashDealCard({ product }: { product: any }) {
	const { add } = useCartStore()
	const { status } = useSession()
	const variant = product.variants?.[0]
	const unitPrice = variant?.pricePerKg ? Math.round(variant.pricePerKg * variant.unitWeight) : 0
	
	// Calculate original price (assume 10-20% discount for flash deals)
	const discountPercent = product.badges?.[0] || 15
	const originalPrice = Math.round(unitPrice / (1 - discountPercent / 100))
	
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
	const productId = product._id || product.id
	
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
	
	return (
		<div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow min-w-[200px] flex-shrink-0">
			{/* Product Image */}
			<Link href={`/products/${product.slug ?? (product.id ?? product._id)}`}>
				<div className="relative h-40 bg-white p-2">
					{product.images?.[0] ? (
						<img
							src={product.images[0]}
							alt={product.title}
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
				<Link href={`/products/${product.slug ?? (product.id ?? product._id)}`}>
					<h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem] hover:text-brand-accent transition-colors">
						{product.title}
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
					className="w-full bg-brand-accent hover:bg-orange-600 text-white text-sm font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2"
				>
					<ShoppingCart className="h-4 w-4" />
					ADD TO CART
				</button>
			</div>
		</div>
	)
}

