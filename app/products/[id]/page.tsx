"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import PriceTierTable from '@/app/components/product/PriceTierTable'
import { formatCurrencyPKR } from '@/app/lib/price'
import { useSession } from 'next-auth/react'
import FlashDealCard from '@/app/components/home/FlashDealCard'
import { Star, Heart, Share2, Facebook, Twitter, Minus, Plus, Check, ChevronLeft, ChevronRight, HelpCircle, Truck, Ruler, MessageCircle } from 'lucide-react'

async function getProduct(id: string) {
	try {
		// Use stale-while-revalidate strategy for better performance
		const res = await fetch(`/api/products/${id}`, { 
			next: { revalidate: 60 }, // Revalidate every 60 seconds
			headers: {
				'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
			}
		})
		if (!res.ok) return null
		const json = await res.json()
		return json.data
	} catch (error) {
		console.error('Error fetching product:', error)
		return null
	}
}

export default function ProductDetailPage() {
	const params = useParams()
	const router = useRouter()
	const id = String(params?.id)
	const [data, setData] = useState<any>(null)
	const [loading, setLoading] = useState(true)
	const [variantId, setVariantId] = useState<string | null>(null)
	const [qty, setQty] = useState(1)
	const [activeImg, setActiveImg] = useState<string>('')
	const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description')
	const [wishlisted, setWishlisted] = useState(false)
	const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0)
	const [reviews, setReviews] = useState<any>(null)
	const [reviewsLoading, setReviewsLoading] = useState(false)
	const [showShippingDialog, setShowShippingDialog] = useState(false)
	const { add } = useCartStore()
	const { status } = useSession()

	useEffect(() => {
		let mounted = true
		let cancelled = false
		
		async function loadProduct() {
			try {
				const d = await getProduct(id)
				if (cancelled || !mounted) return
				
				if (d?.relatedProducts && Array.isArray(d.relatedProducts)) {
					d.relatedProducts = d.relatedProducts.map((id: any) => String(id._id || id || ''))
				}
				setData(d)
				setVariantId(d?.variants?.[0]?.id ?? d?.variants?.[0]?._id ?? null)
				setActiveImg(d?.images?.[0] || '')
				setLoading(false)
			} catch (error) {
				if (!cancelled && mounted) {
					console.error('Error loading product:', error)
					setLoading(false)
				}
			}
		}
		
		loadProduct()
		return () => { 
			mounted = false
			cancelled = true
		}
	}, [id])

	// Load reviews and wishlist status (parallel requests)
	useEffect(() => {
		if (!data) return
		
		const productId = data.id || data._id
		
		// Load reviews and wishlist in parallel
		const promises: Promise<any>[] = [
			fetch(`/api/reviews?productId=${productId}`)
				.then(res => res.json())
				.then(json => {
					if (json?.success) setReviews(json.data)
				})
				.catch(() => {})
		]
		
		if (status === 'authenticated') {
			promises.push(
				fetch('/api/wishlist')
					.then(res => res.json())
					.then(json => {
						if (json?.success && json?.data) {
							const isWishlisted = json.data.products.some(
								(p: any) => p.productId === productId
							)
							setWishlisted(isWishlisted)
						}
					})
					.catch(() => {})
			)
		}
		
		setReviewsLoading(true)
		Promise.all(promises).finally(() => setReviewsLoading(false))
	}, [data, status])

	const selectedVariant = useMemo(() => data?.variants?.find((v: any) => v.id === variantId || String(v._id) === variantId) ?? data?.variants?.[0], [data, variantId])

	// Determine effective price/kg based on qty and tiers
	const effectivePricePerKg = useMemo(() => {
		const base = selectedVariant?.pricePerKg ?? 0
		const tiers = Array.isArray(data?.tiers) ? data.tiers : []
		if (!tiers.length) return base
		const tier = tiers.find((t: any) => qty >= (t?.minQty ?? 0) && (t?.maxQty == null || qty <= t.maxQty))
		return tier?.pricePerKg ?? base
	}, [data?.tiers, qty, selectedVariant])

	// Calculate unit price
	let displayUnitWeight = selectedVariant?.unitWeight || 0
	if (selectedVariant?.unit === 'g') {
		displayUnitWeight = (selectedVariant.unitWeight || 0) * 1000
	} else if (selectedVariant?.unit === 'ml') {
		displayUnitWeight = (selectedVariant.unitWeight || 0) * 1000
	}
	
	const unitPrice = selectedVariant ? Math.round(effectivePricePerKg * selectedVariant.unitWeight) : 0
	const stockQty = typeof (selectedVariant as any)?.stockQty === 'number' ? (selectedVariant as any).stockQty : undefined
	const inStock = stockQty === undefined || stockQty > 0

	// Calculate discount if we have original price (for now, we'll use a placeholder)
	const originalPrice = unitPrice * 1.3 // Placeholder - you can add originalPrice to your variant schema
	const discount = originalPrice > unitPrice ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100) : 0

	const visibleThumbnails = data?.images?.slice(thumbnailStartIndex, thumbnailStartIndex + 3) || []
	const canScrollLeft = thumbnailStartIndex > 0
	const canScrollRight = data?.images && thumbnailStartIndex + 3 < data.images.length

	async function onAdd() {
		try {
			add({ productId: data.id || String(data._id), variantId: selectedVariant?.id || String(selectedVariant?._id), title: data.title, variantLabel: selectedVariant?.label, image: activeImg || data.images?.[0] || '', quantity: qty, unitPrice })
			if (status === 'authenticated') {
				try {
					const res = await fetch('/api/cart', { 
						method: 'POST', 
						headers: { 'Content-Type': 'application/json' }, 
						body: JSON.stringify({ productId: data.id || String(data._id), variantId: selectedVariant?.id || String(selectedVariant?._id), quantity: qty }) 
					})
					if (!res.ok) {
						const json = await res.json().catch(() => ({}))
						console.error('Failed to sync cart to server:', json.message || 'Unknown error')
					}
				} catch (err: any) {
					console.error('Error syncing cart to server:', err.message)
				}
			}
		} catch (error: any) {
			console.error('Error adding to cart:', error)
		}
	}

        async function toggleWishlist() {
                if (status !== 'authenticated') {
                        router.push('/auth/login?callbackUrl=' + encodeURIComponent(window.location.pathname) as any)
                        return
                }

		const productId = data.id || String(data._id)
		
		try {
			if (wishlisted) {
				// Remove from wishlist
				const res = await fetch(`/api/wishlist?productId=${productId}`, { method: 'DELETE' })
				const json = await res.json()
				if (json.success) {
					setWishlisted(false)
				}
			} else {
				// Add to wishlist
				const res = await fetch('/api/wishlist', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ productId, variantId: variantId || null })
				})
				const json = await res.json()
				if (json.success) {
					setWishlisted(true)
				}
			}
		} catch (error) {
			console.error('Wishlist error:', error)
		}
	}

	if (loading) return <div className="container-pg py-8"><div className="skeleton h-64" /></div>
	if (!data) return <div className="container-pg py-8">Product not found.</div>

	return (
		<div className="container-pg py-8">
			<div className="grid gap-8 lg:grid-cols-2">
				{/* Left Side - Product Images */}
				<div>
					{/* Main Image */}
					<div className="aspect-square rounded-xl bg-gray-100 overflow-hidden mb-4">
						{activeImg && <img src={activeImg} alt={data.title} className="h-full w-full object-cover" />}
					</div>
					
					{/* Thumbnail Navigation */}
					{(data.images?.length ?? 0) > 0 && (
						<div className="relative flex items-center gap-2">
							{canScrollLeft && (
								<button 
									onClick={() => setThumbnailStartIndex(Math.max(0, thumbnailStartIndex - 1))}
									className="absolute left-0 z-10 p-1 bg-white border rounded-md shadow-sm hover:bg-gray-50"
								>
									<ChevronLeft className="h-4 w-4" />
								</button>
							)}
							<div className="flex gap-2 flex-1 justify-center">
								{visibleThumbnails.map((src: string, i: number) => (
									<button 
										key={i} 
										onClick={() => setActiveImg(src)} 
										className={`h-20 w-20 rounded-md border-2 overflow-hidden transition-all ${
											activeImg === src ? 'border-brand-accent ring-2 ring-brand-accent/20' : 'border-gray-200'
										}`}
									>
										<img src={src} alt="thumb" className="h-full w-full object-cover" />
									</button>
								))}
							</div>
							{canScrollRight && (
								<button 
									onClick={() => setThumbnailStartIndex(thumbnailStartIndex + 1)}
									className="absolute right-0 z-10 p-1 bg-white border rounded-md shadow-sm hover:bg-gray-50"
								>
									<ChevronRight className="h-4 w-4" />
								</button>
							)}
						</div>
					)}
				</div>

				{/* Right Side - Product Info */}
				<div className="space-y-4">
					{/* Product Name */}
					<h1 className="text-3xl font-semibold text-gray-900">{data.title}</h1>
					
					{/* Star Rating */}
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1">
							{[1, 2, 3, 4, 5].map((star) => (
								<Star 
									key={star} 
									className={`h-5 w-5 ${
										reviews?.averageRating && star <= Math.round(reviews.averageRating)
											? 'text-yellow-400 fill-yellow-400'
											: 'text-gray-300'
									}`} 
								/>
							))}
						</div>
						{reviews && reviews.totalReviews > 0 ? (
							<span className="text-sm text-gray-600">
								({reviews.averageRating.toFixed(1)}) {reviews.totalReviews} {reviews.totalReviews === 1 ? 'review' : 'reviews'}
							</span>
						) : (
							<span className="text-sm text-gray-400">No reviews</span>
						)}
					</div>

					{/* Pricing */}
					<div className="flex items-center gap-3">
						<span className="text-2xl font-bold text-green-600">{formatCurrencyPKR(unitPrice)}</span>
						{discount > 0 && (
							<>
								<span className="text-lg text-gray-400 line-through">{formatCurrencyPKR(originalPrice)}</span>
								<span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-medium rounded">
									-{discount}%
								</span>
							</>
						)}
					</div>

					{/* Short Description */}
					<div className="text-gray-600 leading-relaxed">
						{data.description?.substring(0, 200) || 'No description available.'}
						{data.description && data.description.length > 200 && '...'}
					</div>

					{/* Stock Status */}
					<div className="flex items-center gap-2">
						<Check className="h-5 w-5 text-green-600" />
						<span className="text-sm font-medium text-gray-700">
							{stockQty !== undefined ? `${stockQty} IN STOCK` : 'IN STOCK'}
						</span>
					</div>

					{/* Action Links */}
					<div className="flex items-center gap-6 text-sm">
						<Link 
							href="/returns" 
							className="flex items-center gap-1.5 text-gray-600 hover:text-brand-accent transition-colors"
						>
							<HelpCircle className="h-4 w-4" />
							<span>Return Policy</span>
						</Link>
						<button 
							onClick={() => setShowShippingDialog(true)}
							className="flex items-center gap-1.5 text-gray-600 hover:text-brand-accent transition-colors"
						>
							<Truck className="h-4 w-4" />
							<span>Shipping</span>
						</button>
						<button 
							onClick={() => {
								const productName = data?.title || 'Product'
								const productPrice = unitPrice ? formatCurrencyPKR(unitPrice) : ''
								const productUrl = window.location.href
								const message = `Hi! I'm interested in this product:\n\n${productName}\nPrice: ${productPrice}\nLink: ${productUrl}`
								const whatsappUrl = `https://wa.me/923393399393?text=${encodeURIComponent(message)}`
								window.open(whatsappUrl, '_blank')
							}}
							className="flex items-center gap-1.5 text-gray-600 hover:text-brand-accent transition-colors"
						>
							<MessageCircle className="h-4 w-4" />
							<span>Ask About This product</span>
						</button>
					</div>

					{/* Variant Selection */}
					{data.variants && data.variants.length > 1 && (
						<div>
							<label className="text-sm font-medium text-gray-700 mb-1.5 block">Select Variant</label>
							<div className="flex flex-wrap gap-2">
								{data.variants.map((v: any) => {
									let displayWeight = v.unitWeight || 0
									if (v.unit === 'g') {
										displayWeight = (v.unitWeight || 0) * 1000
									} else if (v.unit === 'ml') {
										displayWeight = (v.unitWeight || 0) * 1000
									}
									const unitLabels: Record<string, string> = { kg: 'kg', g: 'g', l: 'l', ml: 'ml', pcs: 'pcs', pack: 'pack' }
									const unitLabel = unitLabels[v.unit] || v.unit || 'kg'
									const displayWeightStr = `${displayWeight}${unitLabel}`
									const displayLabel = v.label || displayWeightStr
									return (
										<button 
											key={v.id || v._id} 
											onClick={() => setVariantId(v.id || String(v._id))} 
											className={`btn-secondary ${(v.id === variantId || String(v._id) === variantId) ? 'bg-brand-accent text-white border-brand-accent' : ''}`}
										>
											{displayLabel}
										</button>
									)
								})}
							</div>
						</div>
					)}

					{/* Quantity Selector */}
					<div>
						<label className="text-sm font-medium text-gray-700 mb-1.5 block">Quantity</label>
						<div className="flex items-center gap-2">
							<button 
								onClick={() => setQty(Math.max(1, qty - 1))}
								className="h-10 w-10 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
							>
								<Minus className="h-4 w-4" />
							</button>
							<input 
								type="number" 
								min={1} 
								value={qty} 
								onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} 
								className="input-enhanced w-20 text-center"
							/>
							<button 
								onClick={() => setQty(qty + 1)}
								className="h-10 w-10 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
							>
								<Plus className="h-4 w-4" />
							</button>
						</div>
					</div>

					{/* Add to Cart and Wishlist */}
					<div className="flex items-center gap-3">
						<button 
							className="btn-large flex-1 h-12" 
							onClick={onAdd} 
							disabled={!inStock}
						>
							Add to cart
						</button>
						<button 
							onClick={toggleWishlist}
							className={`h-12 w-12 rounded-md border-2 flex items-center justify-center transition-colors ${
								wishlisted ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-300 text-gray-400 hover:border-gray-400'
							}`}
						>
							<Heart className={`h-5 w-5 ${wishlisted ? 'fill-current' : ''}`} />
						</button>
					</div>

					{/* Guaranteed Safe Checkout */}
					<div className="pt-4 border-t">
						<p className="text-xs text-gray-500 mb-2">Guaranteed safe checkout</p>
						<div className="flex items-center gap-3 flex-wrap">
							{/* JazzCash Logo */}
							<div className="h-10 w-20 flex items-center justify-center">
								<img 
									src="/jazzcash.png" 
									alt="JazzCash" 
									className="h-full w-full object-contain"
								/>
							</div>
							{/* EasyPaisa Logo */}
							<div className="h-10 w-20 flex items-center justify-center">
								<img 
									src="/easypaisa.png" 
									alt="EasyPaisa" 
									className="h-full w-full object-contain"
								/>
							</div>
							{/* Visa Logo */}
							<div className="h-10 w-16 flex items-center justify-center">
								<img 
									src="/visa.png" 
									alt="Visa" 
									className="h-full w-full object-contain"
								/>
							</div>
							{/* Mastercard Logo */}
							<div className="h-10 w-16 flex items-center justify-center">
								<img 
									src="/master.png" 
									alt="Mastercard" 
									className="h-full w-full object-contain"
								/>
							</div>
						</div>
					</div>

					{/* Share Buttons */}
					<div className="flex items-center gap-3 pt-4 border-t">
						<span className="text-sm text-gray-600">Share:</span>
						<button 
							onClick={() => {
								const url = window.location.href
								const text = `${data.title} - ${formatCurrencyPKR(unitPrice)}`
								window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
							}}
							className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
							title="Share on Facebook"
						>
							<svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
							</svg>
						</button>
						<button 
							onClick={() => {
								const url = window.location.href
								const text = `${data.title} - ${formatCurrencyPKR(unitPrice)}`
								window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400')
							}}
							className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
							title="Share on Twitter"
						>
							<svg className="h-4 w-4" fill="#1DA1F2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
							</svg>
						</button>
						<button 
							onClick={() => {
								const url = window.location.href
								const text = `Check out ${data.title} - ${formatCurrencyPKR(unitPrice)}`
								window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank', 'width=600,height=400')
							}}
							className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
							title="Share on WhatsApp"
						>
							<svg className="h-4 w-4" fill="#25D366" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
							</svg>
						</button>
						<button 
							onClick={async () => {
								const url = window.location.href
								const text = `${data.title} - ${formatCurrencyPKR(unitPrice)}`
								
								if (navigator.share) {
									try {
										await navigator.share({
											title: data.title,
											text: text,
											url: url
										})
									} catch (err) {
										// User cancelled or error occurred
										console.log('Share cancelled or failed')
									}
								} else {
									// Fallback: copy to clipboard
									await navigator.clipboard.writeText(url)
									alert('Link copied to clipboard!')
								}
							}}
							className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
							title="Share"
						>
							<Share2 className="h-4 w-4 text-gray-600" />
						</button>
					</div>
				</div>
			</div>

			{/* Product Details Tabs */}
			<div className="mt-12">
				<div className="border-b border-gray-200">
					<div className="flex gap-6">
						<button
							onClick={() => setActiveTab('description')}
							className={`pb-4 px-1 text-sm font-medium transition-colors ${
								activeTab === 'description' 
									? 'text-brand-accent border-b-2 border-brand-accent' 
									: 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Description
						</button>
						<button
							onClick={() => setActiveTab('reviews')}
							className={`pb-4 px-1 text-sm font-medium transition-colors ${
								activeTab === 'reviews' 
									? 'text-brand-accent border-b-2 border-brand-accent' 
									: 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Reviews
						</button>
					</div>
				</div>

				<div className="mt-6">
					{activeTab === 'description' && (
						<div className="prose max-w-none">
							<p className="text-gray-700 leading-relaxed whitespace-pre-line">{data.description || 'No description available.'}</p>
							{/* Product Highlights */}
							{selectedVariant && (
								<div className="mt-6">
									<h3 className="text-lg font-semibold mb-3">Product Highlights</h3>
									<ul className="space-y-2">
										<li className="flex items-start gap-2">
											<Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
											<span className="text-gray-700">Price per {selectedVariant.unit === 'g' || selectedVariant.unit === 'kg' ? 'kg' : selectedVariant.unit === 'ml' || selectedVariant.unit === 'l' ? 'liter' : 'unit'}: {formatCurrencyPKR(effectivePricePerKg)}</span>
										</li>
										<li className="flex items-start gap-2">
											<Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
											<span className="text-gray-700">Unit Weight: {displayUnitWeight}{selectedVariant.unit || 'kg'}</span>
										</li>
										{data.brand && (
											<li className="flex items-start gap-2">
												<Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
												<span className="text-gray-700">Brand: {data.brand}</span>
											</li>
										)}
										{data.category && (
											<li className="flex items-start gap-2">
												<Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
												<span className="text-gray-700">Category: {data.category}{data.subCategory ? ` > ${data.subCategory}` : ''}{data.subSubCategory ? ` > ${data.subSubCategory}` : ''}</span>
											</li>
										)}
										{selectedVariant.sku && (
											<li className="flex items-start gap-2">
												<Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
												<span className="text-gray-700">SKU: {selectedVariant.sku}</span>
											</li>
										)}
									</ul>
								</div>
							)}
						</div>
					)}

					{activeTab === 'reviews' && (
						<div>
							{reviewsLoading ? (
								<div className="skeleton h-32" />
							) : reviews && reviews.reviews && reviews.reviews.length > 0 ? (
								<div className="space-y-6">
									{/* Review Summary */}
									<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
										<div className="text-center">
											<div className="text-4xl font-bold text-gray-900 mb-1">
												{reviews.averageRating.toFixed(1)}
											</div>
											<div className="flex items-center justify-center gap-1 mb-2">
												{[1, 2, 3, 4, 5].map((star) => (
													<Star
														key={star}
														className={`h-5 w-5 ${
															star <= Math.round(reviews.averageRating)
																? 'text-yellow-400 fill-yellow-400'
																: 'text-gray-300'
														}`}
													/>
												))}
											</div>
											<p className="text-sm text-gray-600">
												{reviews.totalReviews} {reviews.totalReviews === 1 ? 'review' : 'reviews'}
											</p>
										</div>
										<div className="md:col-span-2 space-y-2">
											{[5, 4, 3, 2, 1].map((rating) => {
												const count = reviews.ratingCounts.find((r: any) => r.rating === rating)?.count || 0
												const percentage = reviews.totalReviews > 0 ? (count / reviews.totalReviews) * 100 : 0
												return (
													<div key={rating} className="flex items-center gap-3">
														<div className="flex items-center gap-1 w-20">
															<span className="text-sm">{rating}</span>
															<Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
														</div>
														<div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
															<div
																className="h-full bg-yellow-400"
																style={{ width: `${percentage}%` }}
															/>
														</div>
														<span className="text-sm text-gray-600 w-12 text-right">{count}</span>
													</div>
												)
											})}
										</div>
									</div>

									{/* Reviews List */}
									<div className="space-y-4">
										{reviews.reviews.map((review: any) => (
											<div key={String(review._id)} className="border-b pb-4">
												<div className="flex items-start justify-between mb-2">
													<div>
														<div className="flex items-center gap-2 mb-1">
															<span className="font-medium">{review.userName}</span>
															{review.verifiedPurchase && (
																<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
																	<Check className="h-3 w-3" />
																	Verified Purchase
																</span>
															)}
														</div>
														<div className="flex items-center gap-1">
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
													</div>
													<span className="text-xs text-gray-500">
														{new Date(review.createdAt).toLocaleDateString()}
													</span>
												</div>
												{review.comment && (
													<p className="text-sm text-gray-700 mt-2">{review.comment}</p>
												)}
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="text-center py-12 text-gray-500">
									<Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
									<p>No reviews yet. Be the first to review this product!</p>
									<p className="text-sm mt-2">Purchase this product to leave a review.</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Related Products */}
			<RelatedProductsSection productId={data.id || String(data._id)} relatedProducts={data.relatedProducts} category={data.category} />

			{/* Shipping Dialog */}
			{showShippingDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowShippingDialog(false)}>
					<div 
						className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-4 sm:p-6">
							{/* Header */}
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									<Truck className="h-6 w-6 text-brand-accent" />
									<div className="font-medium text-lg">Shipping Information</div>
								</div>
								<button 
									onClick={() => setShowShippingDialog(false)}
									className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
								>
									×
								</button>
							</div>

							{/* Content */}
							<div className="space-y-4">
								<div>
									<div className="flex items-center gap-3 mb-3">
										<img 
											src="/standard-delivery.png" 
											alt="Standard Delivery" 
											className="h-8 w-auto object-contain"
											onError={(e) => {
												const target = e.target as HTMLImageElement
												target.style.display = 'none'
											}}
										/>
										<div>
											<div className="font-semibold text-gray-900">Standard Delivery</div>
											<div className="text-sm text-gray-600">Rs. 200 • 3-5 days</div>
										</div>
									</div>
									<p className="text-sm text-gray-700 ml-11">
										Standard delivery takes 3-5 days. Orders are processed and shipped within 24 hours of confirmation. Available for all delivery areas.
									</p>
								</div>

								<div className="border-t pt-4">
									<div className="flex items-center gap-3 mb-3">
										<img 
											src="/express-delivery.png" 
											alt="Express Delivery" 
											className="h-8 w-auto object-contain"
											onError={(e) => {
												const target = e.target as HTMLImageElement
												target.style.display = 'none'
											}}
										/>
										<div>
											<div className="font-semibold text-gray-900">Express Delivery</div>
											<div className="text-sm text-gray-600">Rs. 500 • 1-2 days</div>
										</div>
									</div>
									<p className="text-sm text-gray-700 ml-11">
										Express delivery takes 1-2 days. Orders are processed and shipped with priority handling. Available in select areas only.
									</p>
								</div>

								<div className="border-t pt-4">
									<h4 className="font-semibold text-gray-900 mb-2">Delivery Details</h4>
									<ul className="text-sm text-gray-700 space-y-1.5">
										<li>• Free delivery on orders above Rs. 5,000 (Standard delivery only)</li>
										<li>• Cash on Delivery (COD) available for all orders</li>
										<li>• Track your order via email notifications</li>
										<li>• Delivery times may vary during holidays and peak seasons</li>
										<li>• Contact us if you need to change your delivery address</li>
									</ul>
								</div>
							</div>

							{/* Close Button */}
							<div className="mt-6">
								<button 
									onClick={() => setShowShippingDialog(false)}
									className="btn-primary w-full"
								>
									Got it
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

function RelatedProductsSection({ productId, relatedProducts, category }: { productId: string; relatedProducts?: string[]; category?: string }) {
	const [products, setProducts] = useState<any[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function load() {
			setLoading(true)
			try {
				const relatedIds = relatedProducts && Array.isArray(relatedProducts) 
					? relatedProducts.map((id: any) => {
						if (typeof id === 'object' && id._id) return String(id._id)
						return String(id || '')
					}).filter(Boolean)
					: []
				
				if (relatedIds.length > 0) {
					const promises = relatedIds.map(id => 
						fetch(`/api/products/${id}`, { cache: 'no-store' })
							.then(res => res.json())
							.then(json => json?.data)
							.catch(() => null)
					)
					const results = await Promise.all(promises)
					setProducts(results.filter(Boolean))
				} else if (category) {
					const res = await fetch(`/api/products?category=${encodeURIComponent(category)}&limit=4`, { cache: 'no-store' })
					const json = await res.json()
					const items = (json?.data?.items || []).filter((p: any) => {
						const pid = String(p._id || p.id)
						return pid !== productId
					}).slice(0, 4)
					setProducts(items)
				} else {
					setProducts([])
				}
			} catch {
				setProducts([])
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [productId, relatedProducts, category])

	if (loading) return <div className="mt-10"><div className="skeleton h-32" /></div>
	if (products.length === 0) return null

	return (
		<div className="mt-10">
			<h2 className="text-lg font-semibold mb-4">Related Products</h2>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{products.map((p: any) => (
					<FlashDealCard key={p._id || p.id} product={p} />
				))}
			</div>
		</div>
	)
}
