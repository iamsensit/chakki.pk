"use client"

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export default function NewProductPage() {
	const [title, setTitle] = useState('')
	const [slug, setSlug] = useState('')
	const [description, setDescription] = useState('')
	const [brand, setBrand] = useState('')
	const [category, setCategory] = useState('')
	const [subCategory, setSubCategory] = useState('')
	const [subSubCategory, setSubSubCategory] = useState('')
	const [images, setImages] = useState<string[]>([])
	const [availableCategories, setAvailableCategories] = useState<Array<{ name: string; _id?: string; level?: number; subCategories?: any[] }>>([])
	const [hierarchicalCategories, setHierarchicalCategories] = useState<any[]>([])
	const [variants, setVariants] = useState<Array<{ label: string; unitWeight: number; unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'pack'; sku: string; pricePerKg: number; costPerKg: number; stockQty: number }>>([{ label: '', unitWeight: 1, unit: 'kg', sku: '', pricePerKg: 0, costPerKg: 0, stockQty: 0 }])
	const [saving, setSaving] = useState(false)
const [uploading, setUploading] = useState(false)
const [imageUrl, setImageUrl] = useState('')
const [imageSource, setImageSource] = useState<'public' | 'external'>('public')
const [relatedProducts, setRelatedProducts] = useState<string[]>([])
const [relatedProductsSearch, setRelatedProductsSearch] = useState('')
const [relatedProductsSuggestions, setRelatedProductsSuggestions] = useState<any[]>([])

	function handleTitle(t: string) {
		setTitle(t)
		if (!slug) setSlug(t.toLowerCase().replace(/\s+/g, '-'))
	}

	function loadImage(file: File): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image()
			img.onload = () => resolve(img)
			img.onerror = reject
			const reader = new FileReader()
			reader.onload = () => { img.src = String(reader.result) }
			reader.onerror = reject
			reader.readAsDataURL(file)
		})
	}

	async function compressToDataUrl(file: File) {
		const img = await loadImage(file)
		const maxW = 1200, maxH = 1200
		let { width, height } = img
		const ratio = Math.min(maxW / width, maxH / height, 1)
		width = Math.round(width * ratio)
		height = Math.round(height * ratio)
		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const ctx = canvas.getContext('2d')!
		ctx.drawImage(img, 0, 0, width, height)
		return canvas.toDataURL('image/jpeg', 0.8)
	}

	async function uploadImage(file: File) {
		const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
		const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UNSIGNED_PRESET
		const dataUrl = await compressToDataUrl(file)
		// If Cloudinary is configured, upload there; otherwise, store data URL directly in DB
		if (!cloudName || !preset) {
			return dataUrl
		}
		const blob = await (await fetch(dataUrl)).blob()
		const form = new FormData()
		form.append('file', blob, file.name.replace(/\.[^.]+$/, '.jpg'))
		form.append('upload_preset', preset)
		const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form })
		if (!res.ok) throw new Error('Upload failed')
		const json = await res.json()
		return json.secure_url as string
	}

	async function onSelectFiles(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files || [])
		if (files.length === 0) return
		setUploading(true)
		try {
			const urls: string[] = []
			for (const f of files) {
				const url = await uploadImage(f)
				urls.push(url)
			}
			setImages(prev => [...prev, ...urls])
			toast.success('Images added')
		} catch (e: any) {
			toast.error(e.message || 'Image upload failed')
		} finally {
			setUploading(false)
			e.target.value = ''
		}
	}

	function addVariant() {
		const defaultPrice = variants.length > 0 && variants[0].pricePerKg && variants[0].pricePerKg > 0 ? variants[0].pricePerKg : 0
		const defaultCost = variants.length > 0 && variants[0].costPerKg && variants[0].costPerKg > 0 ? variants[0].costPerKg : 0
		setVariants(prev => [...prev, { label: '', unitWeight: 1, unit: 'kg', sku: '', pricePerKg: defaultPrice, costPerKg: defaultCost, stockQty: 0 }])
	}

	function removeVariant(index: number) {
		if (variants.length > 1) {
			setVariants(prev => prev.filter((_, i) => i !== index))
		}
	}

	function updateVariant(index: number, field: string, value: any) {
		setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
	}

	async function onSave() {
		setSaving(true)
		try {
			// Process variants - derive labels and handle unit conversion
			const processedVariants = variants.map(v => {
				const unitLabels: Record<string, string> = { kg: 'kg', g: 'g', l: 'l', ml: 'ml', pcs: 'pcs', pack: 'pack' }
				const unitLabel = unitLabels[v.unit] || v.unit
				const derivedLabel = (v.label && v.label.trim().length > 0)
					? v.label
					: (v.unitWeight ? `${v.unitWeight}${unitLabel}` : 'Unit')
				
				// Convert unitWeight to base unit for storage:
				// - g -> kg (divide by 1000)
				// - ml -> l (divide by 1000)
				// - kg, l, pcs, pack -> keep as is
				let unitWeightInBase = v.unitWeight
				if (v.unit === 'g') {
					unitWeightInBase = v.unitWeight / 1000 // Convert grams to kg
				} else if (v.unit === 'ml') {
					unitWeightInBase = v.unitWeight / 1000 // Convert ml to liters
				}
				
				return {
					label: derivedLabel,
					unitWeight: unitWeightInBase, // Store in base unit (kg for weight, l for volume, or as-is for pcs/pack)
					unit: v.unit, // Keep original unit for display purposes
					sku: v.sku,
					pricePerKg: v.pricePerKg, // Price per base unit (per kg for weight, per liter for volume, per unit for pcs/pack)
					costPerKg: v.costPerKg || 0, // Cost per base unit (for inventory investment calculation)
					stockQty: v.stockQty
				}
			})

			const body = {
				slug,
				title,
				description,
				brand: brand || undefined,
				category: category || undefined,
				subCategory: subCategory || undefined,
				subSubCategory: subSubCategory || undefined,
				badges: ['Wholesale'],
				images,
				moq: 1,
				inStock: true,
				variants: processedVariants,
				tiers: [],
				relatedProducts: relatedProducts.filter(Boolean),
			}
			const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
			const json = await res.json()
			if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to create product')
			toast.success('Product created')
			setTitle(''); setSlug(''); setDescription(''); setBrand(''); setCategory(''); setSubCategory(''); setSubSubCategory(''); setImages([]); setVariants([{ label: '', unitWeight: 1, unit: 'kg', sku: '', pricePerKg: 0, costPerKg: 0, stockQty: 0 }]); setRelatedProducts([])
		} catch (e: any) {
			toast.error(e.message || 'Could not create product')
		} finally {
			setSaving(false)
		}
	}

	// Load available categories from API (hierarchical)
	useEffect(() => {
		let active = true
		async function load() {
			try {
				const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
				const res = await fetch(`${baseUrl}/api/categories?hierarchical=1`, { cache: 'no-store' })
				const json = await res.json()
				if (json?.data?.hierarchical && json.data.categories) {
					if (active) {
						setHierarchicalCategories(json.data.categories)
						// Also set flat list for backward compatibility
						const flatCats: any[] = []
						function flatten(cats: any[]) {
							for (const cat of cats) {
								flatCats.push({ name: cat.name, _id: cat._id, level: cat.level })
								if (cat.subCategories && cat.subCategories.length > 0) {
									flatten(cat.subCategories)
								}
							}
						}
						flatten(json.data.categories)
						setAvailableCategories(flatCats)
					}
				} else {
					// Fallback to flat structure
					const flatRes = await fetch(`${baseUrl}/api/categories`, { cache: 'no-store' })
					const flatJson = await flatRes.json()
					const cats = (flatJson?.data?.categories || [])
						.map((c: any) => ({ name: String(c?.name || ''), _id: c?._id ? String(c._id) : undefined, level: c?.level ?? 0 }))
						.filter((c: any) => c.name)
					if (active) {
						setAvailableCategories(cats)
						setHierarchicalCategories([])
					}
				}
			} catch {
				if (active) {
					setAvailableCategories([])
					setHierarchicalCategories([])
				}
			}
		}
		load()
		return () => { active = false }
	}, [])
	
	// Reset sub-categories when main category changes
	useEffect(() => {
		setSubCategory('')
		setSubSubCategory('')
	}, [category])
	
	// Reset sub-sub-category when sub-category changes
	useEffect(() => {
		setSubSubCategory('')
	}, [subCategory])

	// Search for related products
	useEffect(() => {
		const t = setTimeout(async () => {
			if (!relatedProductsSearch.trim()) { setRelatedProductsSuggestions([]); return }
			try {
				const res = await fetch(`/api/products?suggest=1&q=${encodeURIComponent(relatedProductsSearch)}&limit=10`)
				const json = await res.json()
				const items = (json?.data?.items || []).filter((p: any) => !relatedProducts.includes(String(p._id || p.id)))
				setRelatedProductsSuggestions(items)
			} catch { setRelatedProductsSuggestions([]) }
		}, 250)
		return () => clearTimeout(t)
	}, [relatedProductsSearch, relatedProducts])

	function addRelatedProduct(productIdToAdd: string) {
		if (!relatedProducts.includes(productIdToAdd)) {
			setRelatedProducts(prev => [...prev, productIdToAdd])
		}
		setRelatedProductsSearch('')
		setRelatedProductsSuggestions([])
	}

	function removeRelatedProduct(productIdToRemove: string) {
		setRelatedProducts(prev => prev.filter(id => id !== productIdToRemove))
	}

	return (
		<div className="mx-auto w-full max-w-3xl">
			<h1 className="text-2xl font-semibold">Add product</h1>
			<div className="mt-6 grid gap-4">
				<div className="rounded-md border p-4 grid gap-3">
					<div className="grid gap-2">
						<label className="text-sm">Title</label>
						<input value={title} onChange={e => handleTitle(e.target.value)} className="rounded-md border px-3 py-2 text-sm" placeholder="e.g. Daal Mash Premium" />
					</div>
					<div className="grid gap-2">
						<label className="text-sm">Slug</label>
						<input value={slug} onChange={e => setSlug(e.target.value)} className="rounded-md border px-3 py-2 text-sm" placeholder="auto-generated-from-title or enter manually" />
					</div>
					<div className="grid gap-2">
						<label className="text-sm">Description</label>
						<textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="rounded-md border px-3 py-2 text-sm" placeholder="Short product description" />
					</div>
					<div className="grid gap-2">
						<div>
							<label className="text-sm">Brand</label>
							<input value={brand} onChange={e => setBrand(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g. Local Mill" />
						</div>
						<div>
							<label className="text-sm">Main Category *</label>
							<select
								value={category}
								onChange={e => setCategory(e.target.value)}
								className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
								required
							>
								<option value="">Select a main category</option>
								{hierarchicalCategories.length > 0 ? (
									hierarchicalCategories.map(cat => (
										<option key={cat._id || cat.name} value={cat.name}>
											{cat.name}
										</option>
									))
								) : (
									availableCategories.filter(c => (c.level ?? 0) === 0).map(cat => (
										<option key={cat.name} value={cat.name}>
											{cat.name}
										</option>
									))
								)}
							</select>
							{availableCategories.length === 0 && (
								<p className="mt-1 text-xs text-slate-500">
									No categories available. Categories must be created separately. <a href="/admin/categories" className="text-brand-accent hover:underline">Go to Categories page to create one</a>
								</p>
							)}
						</div>
						{category && (
							<div>
								<label className="text-sm">Sub-Category (Optional)</label>
								<select
									value={subCategory}
									onChange={e => setSubCategory(e.target.value)}
									className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
								>
									<option value="">Select a sub-category (optional)</option>
									{hierarchicalCategories.length > 0 ? (
										(() => {
											const selectedMain = hierarchicalCategories.find(c => c.name === category)
											return selectedMain?.subCategories?.map((subCat: any) => (
												<option key={subCat._id || subCat.name} value={subCat.name}>
													{subCat.name}
												</option>
											)) || []
										})()
									) : (
										availableCategories.filter(c => {
											// Try to find sub-categories by checking if they have the main category as parent
											// This is a fallback for non-hierarchical data
											return (c.level ?? 0) === 1
										}).map(cat => (
											<option key={cat.name} value={cat.name}>
												{cat.name}
											</option>
										))
									)}
								</select>
							</div>
						)}
						{category && subCategory && (
							<div>
								<label className="text-sm">Sub-Sub-Category (Optional)</label>
								<select
									value={subSubCategory}
									onChange={e => setSubSubCategory(e.target.value)}
									className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
								>
									<option value="">Select a sub-sub-category (optional)</option>
									{hierarchicalCategories.length > 0 ? (
										(() => {
											const selectedMain = hierarchicalCategories.find(c => c.name === category)
											const selectedSub = selectedMain?.subCategories?.find((s: any) => s.name === subCategory)
											return selectedSub?.subCategories?.map((subSubCat: any) => (
												<option key={subSubCat._id || subSubCat.name} value={subSubCat.name}>
													{subSubCat.name}
												</option>
											)) || []
										})()
									) : (
										availableCategories.filter(c => (c.level ?? 0) === 2).map(cat => (
											<option key={cat.name} value={cat.name}>
												{cat.name}
											</option>
										))
									)}
								</select>
							</div>
						)}
					</div>

          <div className="grid gap-2">
            <label className="text-sm">Images (add by URL or /public path)</label>
						<div className="flex items-center gap-2">
							<select
								className="rounded-md border px-2 py-2 text-sm"
								value={imageSource}
								onChange={e => setImageSource(e.target.value as any)}
							>
								<option value="public">Public folder (/path)</option>
								<option value="external">External URL (https://…)</option>
							</select>
							<input
								value={imageUrl}
								onChange={e => setImageUrl(e.target.value)}
								placeholder={imageSource === 'public' ? '/images/photo.jpg' : 'https://site.com/image.jpg'}
								className="flex-1 rounded-md border px-3 py-2 text-sm"
							/>
							<button
								type="button"
								className="rounded-md bg-brand px-3 py-2 text-white text-sm"
								onClick={() => {
									const raw = imageUrl.trim()
									if (!raw) return
									const url = imageSource === 'public' ? (raw.startsWith('/') ? raw : `/${raw}`) : raw
									setImages(prev => [...prev, url])
									setImageUrl('')
								}}
							>
								Add URL
							</button>
						</div>
						{images.length > 0 && (
							<div className="mt-2 grid grid-cols-3 gap-2">
								{images.map((src, idx) => (
									<div key={src + idx} className="relative">
										<img src={src} className="h-24 w-full object-cover rounded border" />
										<button
											type="button"
											className="absolute top-1 right-1 bg-white/80 rounded px-1 text-xs"
											onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
										>
											remove
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="rounded-md border p-4 grid gap-4">
					<div className="flex items-center justify-between">
						<div className="text-sm font-medium">Product Variants</div>
						<button type="button" onClick={addVariant} className="text-sm text-brand-accent hover:underline">
							+ Add Variant
						</button>
					</div>
					{variants.map((variant, idx) => (
						<div key={idx} className="rounded-md border p-3 bg-gray-50">
							<div className="flex items-center justify-between mb-3">
								<div className="text-xs font-medium text-slate-600">Variant {idx + 1}</div>
								{variants.length > 1 && (
									<button type="button" onClick={() => removeVariant(idx)} className="text-xs text-red-600 hover:underline">
										Remove
									</button>
								)}
							</div>
							<div className="grid gap-2 sm:grid-cols-2">
								<div>
									<label className="text-sm">SKU</label>
									<input 
										value={variant.sku} 
										onChange={e => updateVariant(idx, 'sku', e.target.value)} 
										className="w-full rounded-md border px-3 py-2 text-sm" 
										placeholder="e.g. DAALMASH-10KG" 
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-sm">Unit Weight</label>
										<input 
											type="number" 
											value={variant.unitWeight} 
											onChange={e => updateVariant(idx, 'unitWeight', Number(e.target.value))} 
											className="w-full rounded-md border px-3 py-2 text-sm" 
											placeholder="e.g. 10" 
										/>
									</div>
									<div>
										<label className="text-sm">Unit</label>
										<select 
											value={variant.unit} 
											onChange={e => updateVariant(idx, 'unit', e.target.value as any)} 
											className="w-full rounded-md border px-3 py-2 text-sm"
										>
											<option value="kg">kg (Kilogram)</option>
											<option value="g">g (Gram)</option>
											<option value="l">l (Liter)</option>
											<option value="ml">ml (Milliliter)</option>
											<option value="pcs">pcs (Pieces)</option>
											<option value="pack">pack (Pack)</option>
										</select>
									</div>
								</div>
								<div>
									<label className="text-sm">Price per kg (Rs)</label>
									<input 
										type="number" 
										value={variant.pricePerKg} 
										onChange={e => updateVariant(idx, 'pricePerKg', Number(e.target.value))} 
										className="w-full rounded-md border px-3 py-2 text-sm" 
										placeholder="e.g. 150" 
									/>
								</div>
								<div>
									<label className="text-sm">Cost per kg (Rs)</label>
									<input 
										type="number" 
										value={variant.costPerKg || 0} 
										onChange={e => updateVariant(idx, 'costPerKg', Number(e.target.value))} 
										className="w-full rounded-md border px-3 py-2 text-sm" 
										placeholder="e.g. 100 (for inventory investment)" 
									/>
								</div>
								<div>
									<label className="text-sm">Stock qty</label>
									<input 
										type="number" 
										value={variant.stockQty} 
										onChange={e => updateVariant(idx, 'stockQty', Number(e.target.value))} 
										className="w-full rounded-md border px-3 py-2 text-sm" 
										placeholder="e.g. 100" 
									/>
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Related Products */}
				<div className="rounded-md border p-4 grid gap-3">
					<div className="text-sm font-medium">Related Products</div>
					<div className="relative">
						<input
							type="text"
							value={relatedProductsSearch}
							onChange={e => setRelatedProductsSearch(e.target.value)}
							placeholder="Search products to add as related..."
							className="w-full rounded-md border px-3 py-2 text-sm"
						/>
						{relatedProductsSuggestions.length > 0 && (
							<div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-auto">
								{relatedProductsSuggestions.map((p: any) => (
									<button
										key={p._id || p.id}
										type="button"
										onClick={() => addRelatedProduct(String(p._id || p.id))}
										className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
									>
										{p.images?.[0] && <img src={p.images[0]} alt={p.title} className="h-8 w-8 object-cover rounded" />}
										<span>{p.title}</span>
									</button>
								))}
							</div>
						)}
					</div>
					{relatedProducts.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{relatedProducts.map((id) => (
								<div key={id} className="flex items-center gap-2 rounded-md border bg-gray-50 px-2 py-1 text-sm">
									<span className="text-xs text-slate-600">Product ID: {id.slice(-8)}</span>
									<button
										type="button"
										onClick={() => removeRelatedProduct(id)}
										className="text-red-600 hover:text-red-700"
									>
										×
									</button>
								</div>
							))}
						</div>
					)}
					<div className="text-xs text-slate-500">
						{relatedProducts.length === 0 
							? 'No related products. If none are added, products from the same category will be shown.'
							: `${relatedProducts.length} related product(s) added.`}
					</div>
				</div>

				<div>
					<button onClick={onSave} disabled={saving} className="inline-flex items-center rounded-md bg-brand-accent px-3 py-1.5 text-white text-sm">
						{saving ? 'Saving...' : 'Create product'}
					</button>
				</div>
			</div>
		</div>
	)
}
