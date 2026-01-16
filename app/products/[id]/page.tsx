"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import PriceTierTable from '@/app/components/product/PriceTierTable'
import { formatCurrencyPKR } from '@/app/lib/price'
import { useSession } from 'next-auth/react'
import FlashDealCard from '@/app/components/home/FlashDealCard'
import { Star, Heart, Share2, Facebook, Twitter, Minus, Plus, Check, ChevronLeft, ChevronRight, HelpCircle, Truck, Ruler, MessageCircle, Home, ChevronRight as ChevronRightIcon, Shield, Award, Clock } from 'lucide-react'
import OutOfStockRequestButton from '@/app/components/requests/OutOfStockRequestButton'

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
	const [stockError, setStockError] = useState<string>('')
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
				
				// Track product view (best-effort, don't block page load)
				if (d?.id || d?._id) {
					fetch('/api/products/track-view', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ productId: d.id || d._id })
					}).catch(() => {}) // Silently fail if tracking fails
				}
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
	
	// Reset quantity and clear error when variant changes
	useEffect(() => {
		if (selectedVariant) {
			const variantStockQty = typeof (selectedVariant as any)?.stockQty === 'number' ? (selectedVariant as any).stockQty : undefined
			const variantIsLowStock = variantStockQty !== undefined && variantStockQty > 0 && variantStockQty <= 10
			if (variantIsLowStock && variantStockQty !== undefined) {
				setQty(prevQty => {
					if (prevQty > variantStockQty) {
						return variantStockQty
					}
					return prevQty
				})
			}
			setStockError('')
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedVariant?.id || selectedVariant?._id])

	// Determine effective price/kg based on qty and tiers - recalculates when variant changes
	const effectivePricePerKg = useMemo(() => {
		const base = selectedVariant?.pricePerKg ?? 0
		const tiers = Array.isArray(data?.tiers) ? data.tiers : []
		if (!tiers.length) return base
		const tier = tiers.find((t: any) => qty >= (t?.minQty ?? 0) && (t?.maxQty == null || qty <= t.maxQty))
		return tier?.pricePerKg ?? base
	}, [data?.tiers, qty, selectedVariant])

	// Calculate unit price - recalculates when variant or qty changes
	const unitPrice = useMemo(() => {
		if (!selectedVariant) return 0
		return Math.round(effectivePricePerKg * selectedVariant.unitWeight)
	}, [effectivePricePerKg, selectedVariant])
	
	// Calculate display unit weight for showing in product details
	const displayUnitWeight = useMemo(() => {
		if (!selectedVariant?.unitWeight) return 0
		if (selectedVariant.unit === 'g') {
			return (selectedVariant.unitWeight || 0) * 1000
		} else if (selectedVariant.unit === 'ml') {
			return (selectedVariant.unitWeight || 0) * 1000
		} else if (selectedVariant.unit === 'half_kg') {
			return (selectedVariant.unitWeight || 0) * 2
		} else if (selectedVariant.unit === 'quarter_kg') {
			return (selectedVariant.unitWeight || 0) * 4
		}
		return selectedVariant.unitWeight || 0
	}, [selectedVariant])
	
	const stockQty = typeof (selectedVariant as any)?.stockQty === 'number' ? (selectedVariant as any).stockQty : undefined
	const inStock = stockQty === undefined || stockQty > 0
	const isLowStock = stockQty !== undefined && stockQty > 0 && stockQty <= 10
	const maxQuantity = isLowStock ? stockQty : undefined

	// Check if product has discount badge (e.g., "23% OFF")
	const discountBadge = Array.isArray(data?.badges) ? data.badges.find((b: string) => typeof b === 'string' && b.includes('% OFF')) : null
	const discountPercent = discountBadge ? (() => {
		const match = String(discountBadge).match(/(\d+)% OFF/)
		return match ? parseInt(match[1]) : 0
	})() : 0
	
	// Only calculate original price if discount badge exists - recalculates when unitPrice changes
	const originalPrice = useMemo(() => {
		return discountPercent > 0 ? Math.round(unitPrice / (1 - discountPercent / 100)) : unitPrice
	}, [discountPercent, unitPrice])

	const visibleThumbnails = data?.images?.slice(thumbnailStartIndex, thumbnailStartIndex + 3) || []
	const canScrollLeft = thumbnailStartIndex > 0
	const canScrollRight = data?.images && thumbnailStartIndex + 3 < data.images.length

	async function onAdd() {
		// Clear any previous error
		setStockError('')
		
		// Check if stock is low and quantity exceeds available stock
		if (isLowStock && stockQty !== undefined && qty > stockQty) {
			setStockError(`Low stock! Only ${stockQty} ${stockQty === 1 ? 'item' : 'items'} available.`)
			return
		}
		
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
                        // Preserve full URL including query params and hash
                        const currentUrl = window.location.pathname + window.location.search + window.location.hash
                        router.push('/auth/login?callbackUrl=' + encodeURIComponent(currentUrl) as any)
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

	if (loading) return <div className="container-pg py-4 md:py-6 lg:py-8"><div className="skeleton h-64" /></div>
	if (!data) return <div className="container-pg py-4 md:py-6 lg:py-8">Product not found.</div>

	return (
		<div className="container-pg py-4 md:py-6 lg:py-8 pb-16 md:pb-6 lg:pb-8">
			{/* Breadcrumb Navigation */}
			<nav className="mb-4 sm:mb-6" aria-label="Breadcrumb">
				<ol className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
					<li>
						<Link href="/" className="hover:text-brand-accent transition-colors flex items-center gap-1">
							<Home className="h-4 w-4" />
							<span className="hidden sm:inline">Home</span>
						</Link>
					</li>
					{data.category && (
						<>
							<li><ChevronRightIcon className="h-4 w-4 text-gray-400" /></li>
							<li>
								<Link 
									href={`/products?category=${encodeURIComponent(data.category)}`}
									className="hover:text-brand-accent transition-colors"
								>
									{data.category}
								</Link>
							</li>
						</>
					)}
					{data.subCategory && (
						<>
							<li><ChevronRightIcon className="h-4 w-4 text-gray-400" /></li>
							<li>
								<Link 
									href={`/products?category=${encodeURIComponent(data.category || '')}&subCategory=${encodeURIComponent(data.subCategory)}`}
									className="hover:text-brand-accent transition-colors"
								>
									{data.subCategory}
								</Link>
							</li>
						</>
					)}
					{data.subSubCategory && (
						<>
							<li><ChevronRightIcon className="h-4 w-4 text-gray-400" /></li>
							<li>
								<Link 
									href={`/products?category=${encodeURIComponent(data.category || '')}&subCategory=${encodeURIComponent(data.subCategory || '')}`}
									className="hover:text-brand-accent transition-colors"
								>
									{data.subSubCategory}
								</Link>
							</li>
						</>
					)}
					<li><ChevronRightIcon className="h-4 w-4 text-gray-400" /></li>
					<li className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-none">
						{data.title}
					</li>
				</ol>
			</nav>

			<div className="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-2">
				{/* Left Side - Product Images */}
				<div>
					{/* Main Image */}
					<div className="aspect-square rounded-xl bg-gray-100 overflow-hidden mb-4">
						{activeImg && <img src={activeImg} alt={data.title} className="h-full w-full object-cover" />}
					</div>
					
					{/* Thumbnail Navigation */}
					{(data.images?.length ?? 0) > 0 && (
						<div className="relative flex items-center gap-1.5 sm:gap-2">
							{canScrollLeft && (
								<button 
									onClick={() => setThumbnailStartIndex(Math.max(0, thumbnailStartIndex - 1))}
									className="absolute left-0 z-10 p-1 bg-white border  shadow-sm hover:bg-gray-50"
								>
									<ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
								</button>
							)}
							<div className="flex gap-1.5 sm:gap-2 flex-1 justify-center">
								{visibleThumbnails.map((src: string, i: number) => (
									<button 
										key={i} 
										onClick={() => setActiveImg(src)} 
										className={`h-16 w-16 sm:h-20 sm:w-20  border-2 overflow-hidden transition-all ${
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
									className="absolute right-0 z-10 p-1 bg-white border  shadow-sm hover:bg-gray-50"
								>
									<ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
								</button>
							)}
						</div>
					)}
				</div>

				{/* Right Side - Product Info */}
				<div className="space-y-3 sm:space-y-4">
					{/* Product Name */}
					<h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900">{data.title}</h1>
					
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
					<div className="space-y-2">
						{/* Main Price - Show if available */}
						{data.mainPrice ? (
							<div className="flex items-center gap-2 sm:gap-3 flex-wrap">
								<span className="text-2xl sm:text-3xl font-bold text-green-600">
									{formatCurrencyPKR(data.mainPrice)}
									{data.mainPriceUnit && (
										<span className="text-base sm:text-lg font-normal text-gray-600 ml-1">
											/ {data.mainPriceUnit}
										</span>
									)}
								</span>
								{discountPercent > 0 && originalPrice > unitPrice && (
									<>
										<span className="text-base sm:text-lg text-gray-400 line-through">{formatCurrencyPKR(originalPrice)}</span>
										<span className="px-2 py-1 bg-green-100 text-green-700 text-xs sm:text-sm font-semibold rounded discount-badge">
											-{discountPercent}%
										</span>
									</>
								)}
							</div>
						) : (
							/* Show selected variant price with price per unit info */
							<div className="flex items-center gap-2 sm:gap-3 flex-wrap">
								<div className="flex flex-col">
									<span className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrencyPKR(unitPrice)}</span>
									{selectedVariant && (
										<span className="text-sm text-gray-600">
											Price per {
												selectedVariant.unit === 'kg' || selectedVariant.unit === 'half_kg' || selectedVariant.unit === 'quarter_kg' || selectedVariant.unit === 'g' 
													? 'kg' 
													: selectedVariant.unit === 'l' || selectedVariant.unit === 'ml' 
														? 'liter' 
														: 'unit'
											}: {formatCurrencyPKR(effectivePricePerKg)}
										</span>
									)}
								</div>
								{discountPercent > 0 && originalPrice > unitPrice && (
									<>
										<span className="text-base sm:text-lg text-gray-400 line-through">{formatCurrencyPKR(originalPrice)}</span>
										<span className="px-2 py-1 bg-green-100 text-green-700 text-xs sm:text-sm font-semibold rounded discount-badge">
											-{discountPercent}%
										</span>
									</>
								)}
							</div>
						)}
					</div>

					{/* Short Description */}
					<div className="text-gray-600 leading-relaxed whitespace-pre-line">
						{data.description?.substring(0, 200) || 'No description available.'}
						{data.description && data.description.length > 200 && '...'}
					</div>

					{/* Stock Status - Only show if in stock, no numbers */}
					{inStock && (
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Check className="h-5 w-5 text-green-600" />
								<span className="text-sm font-medium text-gray-700">IN STOCK</span>
							</div>
							{/* Low Stock Warning - Only show if stock <= 10 */}
							{stockQty !== undefined && stockQty > 0 && stockQty <= 10 && (
								<div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200">
									<span className="text-xs sm:text-sm font-medium text-yellow-800">
										⚠️ Low stock! Only {stockQty} {stockQty === 1 ? 'item' : 'items'} remaining.
									</span>
								</div>
							)}
						</div>
					)}

					{/* Action Links */}
					<div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm">
						<Link 
							href="/returns" 
							className="flex items-center gap-1.5 text-gray-600 hover:text-brand-accent transition-colors"
						>
							<HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							<span>Return Policy</span>
						</Link>
						<button 
							onClick={() => setShowShippingDialog(true)}
							className="flex items-center gap-1.5 text-gray-600 hover:text-brand-accent transition-colors"
						>
							<Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
							<MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							<span className="hidden sm:inline">Ask About This product</span>
							<span className="sm:hidden">Ask About</span>
						</button>
					</div>

					{/* Variant Selection */}
					{data.variants && data.variants.length > 1 && (
						<div>
							<label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 block">Select Variant</label>
							<div className="flex flex-wrap gap-1.5 sm:gap-2">
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
											className={`btn-secondary text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 ${(v.id === variantId || String(v._id) === variantId) ? 'bg-brand-accent text-white border-brand-accent' : ''}`}
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
						<label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 block">Quantity</label>
						<div className="flex items-center gap-1.5 sm:gap-2">
							<button 
								onClick={() => {
									setQty(Math.max(1, qty - 1))
									setStockError('')
								}}
								className="h-9 w-9 sm:h-10 sm:w-10  border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
							>
								<Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							</button>
							<input 
								type="number" 
								min={1} 
								max={maxQuantity}
								value={qty} 
								onChange={(e) => {
									const newQty = Math.max(1, Number(e.target.value))
									if (maxQuantity && newQty > maxQuantity) {
										setStockError(`Low stock! Only ${maxQuantity} ${maxQuantity === 1 ? 'item' : 'items'} available.`)
										setQty(maxQuantity)
									} else {
										setQty(newQty)
										setStockError('')
									}
								}} 
								className="input-enhanced w-16 sm:w-20 text-center text-sm sm:text-base"
							/>
							<button 
								onClick={() => {
									if (maxQuantity && qty >= maxQuantity) {
										setStockError(`Low stock! Only ${maxQuantity} ${maxQuantity === 1 ? 'item' : 'items'} available.`)
									} else {
										setQty(qty + 1)
										setStockError('')
									}
								}}
								disabled={maxQuantity !== undefined && qty >= maxQuantity}
								className="h-9 w-9 sm:h-10 sm:w-10  border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							</button>
						</div>
						{/* Stock Error Message */}
						{stockError && (
							<div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded">
								<span className="text-xs sm:text-sm font-medium text-red-800">{stockError}</span>
							</div>
						)}
					</div>

					{/* Add to Cart and Wishlist */}
					<div className="flex items-center gap-2 sm:gap-3">
						<button 
							className="btn-large flex-1 h-11 sm:h-12 text-sm sm:text-base" 
							onClick={onAdd} 
							disabled={!inStock}
						>
							Add to cart
						</button>
						<button 
							onClick={toggleWishlist}
							className={`h-11 w-11 sm:h-12 sm:w-12  border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
								wishlisted ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-300 text-gray-400 hover:border-gray-400'
							}`}
						>
							<Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${wishlisted ? 'fill-current' : ''}`} />
						</button>
					</div>
					
					{/* Out of Stock Request */}
					{!inStock && (
						<OutOfStockRequestButton
							productId={data.id || String(data._id)}
							productTitle={data.title}
							variantId={selectedVariant?.id || String(selectedVariant?._id)}
							variantLabel={selectedVariant?.label}
						/>
					)}

					{/* Guaranteed Safe Checkout */}
					<div className="pt-3 sm:pt-4 border-t">
						<p className="text-[10px] sm:text-xs text-gray-500 mb-2">Guaranteed safe checkout</p>
						<div className="flex items-center gap-2 sm:gap-3 flex-wrap">
							{/* JazzCash Logo */}
							<div className="h-8 w-16 sm:h-10 sm:w-20 flex items-center justify-center">
								<img 
									src="/jazzcash.png" 
									alt="JazzCash" 
									className="h-full w-full object-contain"
								/>
							</div>
							{/* EasyPaisa Logo */}
							<div className="h-8 w-16 sm:h-10 sm:w-20 flex items-center justify-center">
								<img 
									src="/easypaisa.png" 
									alt="EasyPaisa" 
									className="h-full w-full object-contain"
								/>
							</div>
							{/* Visa Logo */}
							<div className="h-8 w-12 sm:h-10 sm:w-16 flex items-center justify-center">
								<img 
									src="/visa.png" 
									alt="Visa" 
									className="h-full w-full object-contain"
								/>
							</div>
							{/* Mastercard Logo */}
							<div className="h-8 w-12 sm:h-10 sm:w-16 flex items-center justify-center">
								<img 
									src="/master.png" 
									alt="Mastercard" 
									className="h-full w-full object-contain"
								/>
							</div>
						</div>
					</div>

					{/* Trust Badges & Features */}
					<div className="pt-3 sm:pt-4 border-t space-y-3">
						<div className="grid grid-cols-2 gap-3 sm:gap-4">
							<div className="flex items-start gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
								<Shield className="h-4 w-4 sm:h-5 sm:w-5 text-brand-accent flex-shrink-0 mt-0.5" />
								<div>
									<div className="text-xs sm:text-sm font-semibold text-gray-900">Secure Payment</div>
									<div className="text-[10px] sm:text-xs text-gray-600">100% Secure Checkout</div>
								</div>
							</div>
							<div className="flex items-start gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
								<Truck className="h-4 w-4 sm:h-5 sm:w-5 text-brand-accent flex-shrink-0 mt-0.5" />
								<div>
									<div className="text-xs sm:text-sm font-semibold text-gray-900">Fast Delivery</div>
									<div className="text-[10px] sm:text-xs text-gray-600">Quick & Reliable</div>
								</div>
							</div>
							<div className="flex items-start gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
								<Award className="h-4 w-4 sm:h-5 sm:w-5 text-brand-accent flex-shrink-0 mt-0.5" />
								<div>
									<div className="text-xs sm:text-sm font-semibold text-gray-900">Quality Assured</div>
									<div className="text-[10px] sm:text-xs text-gray-600">Fresh Products</div>
								</div>
							</div>
							<div className="flex items-start gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
								<Clock className="h-4 w-4 sm:h-5 sm:w-5 text-brand-accent flex-shrink-0 mt-0.5" />
								<div>
									<div className="text-xs sm:text-sm font-semibold text-gray-900">24/7 Support</div>
									<div className="text-[10px] sm:text-xs text-gray-600">Always Available</div>
								</div>
							</div>
						</div>
					</div>

					{/* Product Specifications */}
					{(data.brand || data.category || selectedVariant?.sku) && (
						<div className="pt-3 sm:pt-4 border-t">
							<h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Product Details</h3>
							<div className="space-y-2 text-xs sm:text-sm">
								{data.brand && (
									<div className="flex justify-between">
										<span className="text-gray-600">Brand:</span>
										<span className="text-gray-900 font-medium">{data.brand}</span>
									</div>
								)}
								{data.category && (
									<div className="flex justify-between">
										<span className="text-gray-600">Category:</span>
										<Link href={`/products?category=${encodeURIComponent(data.category)}`} className="text-brand-accent hover:underline font-medium">
											{data.category}
										</Link>
									</div>
								)}
								{data.subCategory && (
									<div className="flex justify-between">
										<span className="text-gray-600">Sub-Category:</span>
										<Link href={`/products?category=${encodeURIComponent(data.category || '')}&subCategory=${encodeURIComponent(data.subCategory)}`} className="text-brand-accent hover:underline font-medium">
											{data.subCategory}
										</Link>
									</div>
								)}
								{selectedVariant?.sku && (
									<div className="flex justify-between">
										<span className="text-gray-600">SKU:</span>
										<span className="text-gray-900 font-medium">{selectedVariant.sku}</span>
									</div>
								)}
								{selectedVariant && (
									<div className="flex justify-between">
										<span className="text-gray-600">Weight/Size:</span>
										<span className="text-gray-900 font-medium">{selectedVariant.label || `${selectedVariant.unitWeight || 0}${selectedVariant.unit || 'kg'}`}</span>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Share Buttons */}
					<div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
						<span className="text-xs sm:text-sm text-gray-600">Share:</span>
						<button 
							onClick={() => {
								const url = window.location.href
								const text = `${data.title} - ${formatCurrencyPKR(unitPrice)}`
								window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
							}}
							className="p-1.5 sm:p-2  border border-gray-300 hover:bg-gray-50 transition-colors"
							title="Share on Facebook"
						>
							<svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="#1877F2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
							</svg>
						</button>
						<button 
							onClick={() => {
								const url = window.location.href
								const text = `${data.title} - ${formatCurrencyPKR(unitPrice)}`
								window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400')
							}}
							className="p-1.5 sm:p-2  border border-gray-300 hover:bg-gray-50 transition-colors"
							title="Share on Twitter"
						>
							<svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="#1DA1F2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
							</svg>
						</button>
						<button 
							onClick={() => {
								const url = window.location.href
								const text = `Check out ${data.title} - ${formatCurrencyPKR(unitPrice)}`
								window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank', 'width=600,height=400')
							}}
							className="p-1.5 sm:p-2  border border-gray-300 hover:bg-gray-50 transition-colors"
							title="Share on WhatsApp"
						>
							<svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="#25D366" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
							className="p-1.5 sm:p-2  border border-gray-300 hover:bg-gray-50 transition-colors"
							title="Share"
						>
							<Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
						</button>
					</div>
				</div>
			</div>

			{/* Product Details Tabs */}
			<div className="mt-6 sm:mt-8 md:mt-12">
				<div className="border-b border-gray-200">
					<div className="flex gap-4 sm:gap-6">
						<button
							onClick={() => setActiveTab('description')}
							className={`pb-3 sm:pb-4 px-1 text-xs sm:text-sm font-medium transition-colors ${
								activeTab === 'description' 
									? 'text-brand-accent border-b-2 border-brand-accent' 
									: 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Description
						</button>
						<button
							onClick={() => setActiveTab('reviews')}
							className={`pb-3 sm:pb-4 px-1 text-xs sm:text-sm font-medium transition-colors ${
								activeTab === 'reviews' 
									? 'text-brand-accent border-b-2 border-brand-accent' 
									: 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Reviews
						</button>
					</div>
				</div>

				<div className="mt-4 sm:mt-6">
					{activeTab === 'description' && (
						<div className="prose max-w-none">
							<div className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
								{data.description?.split('\n').map((line: string, idx: number) => (
									<span key={idx}>
										{line}
										{idx < data.description.split('\n').length - 1 && <br />}
									</span>
								)) || 'No description available.'}
							</div>
							{/* Product Highlights */}
							{selectedVariant && (
								<div className="mt-6">
									<h3 className="text-lg font-semibold mb-3">Product Highlights</h3>
									<ul className="space-y-2">
										<li className="flex items-start gap-2">
											<Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
											<span className="text-gray-700">
												Price per {
													selectedVariant.unit === 'g' || selectedVariant.unit === 'kg' || selectedVariant.unit === 'half_kg' || selectedVariant.unit === 'quarter_kg' 
														? 'kg' 
														: selectedVariant.unit === 'ml' || selectedVariant.unit === 'l' 
															? 'liter' 
															: 'unit'
												}: {formatCurrencyPKR(effectivePricePerKg)}
											</span>
										</li>
										<li className="flex items-start gap-2">
											<Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
											<span className="text-gray-700">
												Unit Weight: {displayUnitWeight}
												{selectedVariant.unit === 'half_kg' ? 'half kg' : 
												 selectedVariant.unit === 'quarter_kg' ? 'quarter kg' : 
												 selectedVariant.unit || 'kg'}
											</span>
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
						className="bg-white  shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
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
		<div className="mt-6 sm:mt-8 md:mt-10">
			<h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Related Products</h2>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
				{products.map((p: any) => (
					<FlashDealCard key={p._id || p.id} product={p} />
				))}
			</div>
		</div>
	)
}
