"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import PriceTierTable from '@/app/components/product/PriceTierTable'
import { formatCurrencyPKR } from '@/app/lib/price'
import { useSession } from 'next-auth/react'
import FlashDealCard from '@/app/components/home/FlashDealCard'

async function getProduct(id: string) {
	const res = await fetch(`/api/products/${id}`, { cache: 'no-store' })
	if (!res.ok) return null
	const json = await res.json()
	return json.data
}

export default function ProductDetailPage() {
	const params = useParams()
	const id = String(params?.id)
	const [data, setData] = useState<any>(null)
	const [loading, setLoading] = useState(true)
	const [variantId, setVariantId] = useState<string | null>(null)
	const [qty, setQty] = useState(1)
	const [activeImg, setActiveImg] = useState<string>('')
	const { add } = useCartStore()
	const { status } = useSession()

	useEffect(() => {
		let mounted = true
		getProduct(id).then((d) => { 
			if (mounted) { 
				// Convert relatedProducts ObjectIds to strings if needed
				if (d?.relatedProducts && Array.isArray(d.relatedProducts)) {
					d.relatedProducts = d.relatedProducts.map((id: any) => String(id._id || id || ''))
				}
				setData(d); 
				setVariantId(d?.variants?.[0]?.id ?? d?.variants?.[0]?._id ?? null); 
				setActiveImg(d?.images?.[0] || ''); 
				setLoading(false) 
			} 
		})
		return () => { mounted = false }
	}, [id])

	const selectedVariant = useMemo(() => data?.variants?.find((v: any) => v.id === variantId || String(v._id) === variantId) ?? data?.variants?.[0], [data, variantId])

	// Determine effective price/kg based on qty and tiers (min/max)
	const effectivePricePerKg = useMemo(() => {
		const base = selectedVariant?.pricePerKg ?? 0
		const tiers = Array.isArray(data?.tiers) ? data.tiers : []
		if (!tiers.length) return base
		const tier = tiers.find((t: any) => qty >= (t?.minQty ?? 0) && (t?.maxQty == null || qty <= t.maxQty))
		return tier?.pricePerKg ?? base
	}, [data?.tiers, qty, selectedVariant])

	// Calculate unit price: unitWeight is stored in base unit (kg for weight, l for volume, or as-is for pcs/pack)
	// For display: convert back to display unit if needed
	let displayUnitWeight = selectedVariant?.unitWeight || 0
	if (selectedVariant?.unit === 'g') {
		displayUnitWeight = (selectedVariant.unitWeight || 0) * 1000 // Convert kg to grams
	} else if (selectedVariant?.unit === 'ml') {
		displayUnitWeight = (selectedVariant.unitWeight || 0) * 1000 // Convert liters to ml
	}
	
	// Price calculation: pricePerBaseUnit * unitWeight (unitWeight is in base unit)
	// Example: if pricePerKg = 500 and unitWeight = 0.5kg (500g), then price = 500 * 0.5 = 250
	const unitPrice = selectedVariant ? Math.round(effectivePricePerKg * selectedVariant.unitWeight) : 0
	const lowStock = typeof (selectedVariant as any)?.stockQty === 'number' ? (selectedVariant as any).stockQty : undefined

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

	if (loading) return <div className="container-pg py-8"><div className="skeleton h-64" /></div>
	if (!data) return <div className="container-pg py-8">Product not found.</div>

	return (
		<div className="container-pg py-8">
			<div className="grid gap-8 lg:grid-cols-2">
				<div>
					<div className="aspect-square rounded-xl bg-gray-100 overflow-hidden">
						{activeImg && <img src={activeImg} alt={data.title} className="h-full w-full object-cover" />}
					</div>
					{(data.images?.length ?? 0) > 0 && (
						<div className="mt-3 flex gap-2">
							{data.images.slice(0, 6).map((src: string, i: number) => (
								<button key={i} onClick={() => setActiveImg(src)} className={`h-16 w-16 rounded border overflow-hidden ${activeImg === src ? 'ring-2 ring-brand' : ''}`}>
									<img src={src} alt="thumb" className="h-full w-full object-cover" />
								</button>
							))}
						</div>
					)}
				</div>
				<div>
					<h1 className="text-2xl font-semibold">{data.title}</h1>
					<div className="mt-1 text-slate-600">{data.brand} • {data.category}</div>
					{selectedVariant && (
						<div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand/10 px-4 py-2 border border-brand/20">
							<span className="text-sm font-medium text-slate-600">Price per kg:</span>
							<span className="text-lg font-bold text-brand-accent">{formatCurrencyPKR(effectivePricePerKg)}/kg</span>
						</div>
					)}
					<div className="mt-3">{data.description}</div>
					<div className="mt-4">
						<label className="text-sm font-medium">Variant</label>
						<div className="mt-2 flex flex-wrap gap-2">
						{data.variants.map((v: any) => {
							// Convert to display unit
							let displayWeight = v.unitWeight || 0
							if (v.unit === 'g') {
								displayWeight = (v.unitWeight || 0) * 1000 // Convert kg to grams
							} else if (v.unit === 'ml') {
								displayWeight = (v.unitWeight || 0) * 1000 // Convert liters to ml
							}
							const unitLabels: Record<string, string> = { kg: 'kg', g: 'g', l: 'l', ml: 'ml', pcs: 'pcs', pack: 'pack' }
							const unitLabel = unitLabels[v.unit] || v.unit || 'kg'
							const displayWeightStr = `${displayWeight}${unitLabel}`
							const displayLabel = v.label || displayWeightStr
								return (
									<button 
										key={v.id || v._id} 
										onClick={() => setVariantId(v.id || String(v._id))} 
										className={`rounded-md border px-3 py-1.5 text-sm ${(v.id === variantId || String(v._id) === variantId) ? 'bg-brand text-white border-brand' : ''}`}
									>
										{displayLabel}
									</button>
								)
							})}
						</div>
					</div>
					<div className="mt-4 flex items-center justify-between">
						<div>
							<div className="text-2xl font-semibold">{formatCurrencyPKR(unitPrice)}</div>
							<div className="text-sm text-slate-600">
								Rs{effectivePricePerKg}/{selectedVariant?.unit === 'g' || selectedVariant?.unit === 'kg' ? 'kg' : selectedVariant?.unit === 'ml' || selectedVariant?.unit === 'l' ? 'l' : 'unit'} • {displayUnitWeight}{selectedVariant?.unit || 'kg'}
							</div>
              {typeof lowStock === 'number' && (
                <div className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${lowStock <= 0 ? 'bg-red-100 text-red-700' : lowStock <= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {lowStock <= 0 ? 'Out of stock' : lowStock <= 10 ? 'Low stock' : `In stock: ${lowStock}`}
								</div>
							)}
						</div>
						<div className="flex items-center gap-3">
							<input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-24 rounded border px-3 py-2" />
							<button className="rounded-md bg-brand px-4 py-2 text-white disabled:opacity-50" onClick={onAdd} disabled={typeof lowStock === 'number' && lowStock <= 0}>
								Add to cart
							</button>
						</div>
					</div>

					<PriceTierTable tiers={data.tiers} />
				</div>
			</div>

			{/* Related Products */}
			<RelatedProductsSection productId={data.id || String(data._id)} relatedProducts={data.relatedProducts} category={data.category} />
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
				// Convert relatedProducts to strings if they're ObjectIds
				const relatedIds = relatedProducts && Array.isArray(relatedProducts) 
					? relatedProducts.map((id: any) => {
						// Handle both ObjectId objects and strings
						if (typeof id === 'object' && id._id) return String(id._id)
						return String(id || '')
					}).filter(Boolean)
					: []
				
				if (relatedIds.length > 0) {
					// Fetch related products by IDs
					const promises = relatedIds.map(id => 
						fetch(`/api/products/${id}`, { cache: 'no-store' })
							.then(res => res.json())
							.then(json => json?.data)
							.catch(() => null)
					)
					const results = await Promise.all(promises)
					setProducts(results.filter(Boolean))
				} else if (category) {
					// Fetch products from same category
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
