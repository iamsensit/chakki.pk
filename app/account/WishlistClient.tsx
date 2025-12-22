"use client"

import { useEffect, useState } from 'react'
import { Heart, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import FlashDealCard from '@/app/components/home/FlashDealCard'

export default function WishlistClient() {
	const [wishlist, setWishlist] = useState<any>(null)
	const [products, setProducts] = useState<any[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadWishlist()
	}, [])

	async function loadWishlist() {
		setLoading(true)
		try {
			const res = await fetch('/api/wishlist')
			const json = await res.json()
			if (json?.success && json?.data) {
				setWishlist(json.data)
				// Load product details
				const productPromises = json.data.products.map((item: any) =>
					fetch(`/api/products/${item.productId}`)
						.then(r => r.json())
						.then(j => j?.data)
						.catch(() => null)
				)
				const productResults = await Promise.all(productPromises)
				setProducts(productResults.filter(Boolean))
			}
		} catch (error) {
			toast.error('Failed to load wishlist')
		} finally {
			setLoading(false)
		}
	}

	async function removeFromWishlist(productId: string, variantId?: string) {
		try {
			const url = `/api/wishlist?productId=${productId}${variantId ? `&variantId=${variantId}` : ''}`
			const res = await fetch(url, { method: 'DELETE' })
			const json = await res.json()
			
			if (!res.ok || !json.success) {
				throw new Error(json.message || 'Failed to remove from wishlist')
			}

			toast.success('Removed from wishlist')
			loadWishlist()
		} catch (error: any) {
			toast.error(error.message || 'Failed to remove from wishlist')
		}
	}

	if (loading) return <div className="skeleton h-32" />

	if (!wishlist || products.length === 0) {
		return (
			<div className="text-center py-12">
				<Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
				<p className="text-gray-600">Your wishlist is empty</p>
				<Link href="/products" className="btn-primary mt-4 inline-block">
					Browse Products
				</Link>
			</div>
		)
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-lg font-semibold">My Wishlist ({products.length})</h2>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{products.map((product) => (
					<div key={product._id || product.id} className="relative">
						<FlashDealCard product={product} />
						<button
							onClick={() => removeFromWishlist(
								product.id || String(product._id),
								wishlist.products.find((p: any) => p.productId === (product.id || String(product._id)))?.variantId
							)}
							className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 text-red-600 transition-colors z-10"
						>
							<Trash2 className="h-4 w-4" />
						</button>
					</div>
				))}
			</div>
		</div>
	)
}

