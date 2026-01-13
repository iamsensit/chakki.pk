"use client"

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import ImageUpload from '@/app/components/admin/ImageUpload'

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
	const [variants, setVariants] = useState<Array<{ label: string; unitWeight: number; unit: 'kg' | 'g' | 'half_kg' | 'quarter_kg' | 'l' | 'ml' | 'pcs' | 'pack' | 'unit'; sku: string; pricePerKg: number; costPerKg: number; stockQty: number }>>([{ label: '', unitWeight: 1, unit: 'kg', sku: '', pricePerKg: 0, costPerKg: 0, stockQty: 0 }])
	const [saving, setSaving] = useState(false)
	const [isDiscounted, setIsDiscounted] = useState(false)
	const [discountPercent, setDiscountPercent] = useState<number>(0)
const [relatedProducts, setRelatedProducts] = useState<string[]>([])
const [relatedProductsSearch, setRelatedProductsSearch] = useState('')
const [relatedProductsSuggestions, setRelatedProductsSuggestions] = useState<any[]>([])

	function handleTitle(t: string) {
		setTitle(t)
		if (!slug) setSlug(t.toLowerCase().replace(/\s+/g, '-'))
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

	// Convert unit to base unit (kg for weight, l for volume, or as-is for pcs/pack/unit)
	function getBaseUnitWeight(unitWeight: number, unit: string): number {
		if (unit === 'g') return unitWeight / 1000
		if (unit === 'ml') return unitWeight / 1000
		if (unit === 'half_kg') return unitWeight / 2
		if (unit === 'quarter_kg') return unitWeight / 4
		return unitWeight // kg, l, pcs, pack, unit stay as-is
	}

	// Check if units are compatible for proportional pricing (same category)
	function areUnitsCompatible(unit1: string, unit2: string): boolean {
		const weightUnits = ['kg', 'g', 'half_kg', 'quarter_kg']
		const volumeUnits = ['l', 'ml']
		const countUnits = ['pcs', 'pack', 'unit']
		
		const isWeight1 = weightUnits.includes(unit1)
		const isWeight2 = weightUnits.includes(unit2)
		const isVolume1 = volumeUnits.includes(unit1)
		const isVolume2 = volumeUnits.includes(unit2)
		const isCount1 = countUnits.includes(unit1)
		const isCount2 = countUnits.includes(unit2)
		
		return (isWeight1 && isWeight2) || (isVolume1 && isVolume2) || (isCount1 && isCount2)
	}

	function updateVariant(index: number, field: string, value: any) {
		setVariants(prev => {
			const updated = prev.map((v, i) => {
				if (i === index) {
					const newVariant = { ...v, [field]: value }
					
					
					// If unit or unitWeight changed, recalculate price/cost based on main variant
					if (index > 0 && (field === 'unit' || field === 'unitWeight')) {
						const mainVariant = prev[0]
						if (mainVariant && mainVariant.pricePerKg > 0 && areUnitsCompatible(mainVariant.unit, newVariant.unit)) {
							const mainBaseWeight = getBaseUnitWeight(mainVariant.unitWeight, mainVariant.unit)
							const newBaseWeight = getBaseUnitWeight(newVariant.unitWeight, newVariant.unit)
							
							if (mainBaseWeight > 0) {
								const ratio = newBaseWeight / mainBaseWeight
								newVariant.pricePerKg = Math.round(mainVariant.pricePerKg * ratio)
								if (mainVariant.costPerKg > 0) {
									newVariant.costPerKg = Math.round(mainVariant.costPerKg * ratio)
								}
							}
						}
					}
					
					return newVariant
				}
				
				// If main variant price/cost changed, update this variant proportionally
				if (index === 0 && (field === 'pricePerKg' || field === 'costPerKg') && i > 0) {
					const mainVariant = { ...prev[0], [field]: value }
					if (areUnitsCompatible(mainVariant.unit, v.unit)) {
						const mainBaseWeight = getBaseUnitWeight(mainVariant.unitWeight, mainVariant.unit)
						const variantBaseWeight = getBaseUnitWeight(v.unitWeight, v.unit)
						
						if (mainBaseWeight > 0) {
							const ratio = variantBaseWeight / mainBaseWeight
							if (field === 'pricePerKg') {
								return { ...v, pricePerKg: Math.round(mainVariant.pricePerKg * ratio) }
							} else if (field === 'costPerKg') {
								return { ...v, costPerKg: Math.round(mainVariant.costPerKg * ratio) }
							}
						}
					}
				}
				
				return v
			})
			
			// After updating main variant price/cost, update all other variants
			if (index === 0 && (field === 'pricePerKg' || field === 'costPerKg')) {
				const mainVariant = updated[0]
				return updated.map((v, i) => {
					if (i === 0) return v
					if (areUnitsCompatible(mainVariant.unit, v.unit)) {
						const mainBaseWeight = getBaseUnitWeight(mainVariant.unitWeight, mainVariant.unit)
						const variantBaseWeight = getBaseUnitWeight(v.unitWeight, v.unit)
						
						if (mainBaseWeight > 0) {
							const ratio = variantBaseWeight / mainBaseWeight
							if (field === 'pricePerKg') {
								return { ...v, pricePerKg: Math.round(mainVariant.pricePerKg * ratio) }
							} else if (field === 'costPerKg') {
								return { ...v, costPerKg: Math.round(mainVariant.costPerKg * ratio) }
							}
						}
					}
					return v
				})
			}
			
			return updated
		})
	}

	async function onSave() {
		setSaving(true)
		try {
			// Process variants - derive labels and handle unit conversion
			const processedVariants = variants.map(v => {
				const unitLabels: Record<string, string> = { 
					kg: 'kg', g: 'g', half_kg: 'half kg', quarter_kg: 'quarter kg',
					l: 'l', ml: 'ml', pcs: 'pcs', pack: 'pack', unit: 'unit' 
				}
				const unitLabel = unitLabels[v.unit] || v.unit
				const derivedLabel = (v.label && v.label.trim().length > 0)
					? v.label
					: (v.unitWeight ? `${v.unitWeight}${unitLabel}` : 'Unit')
				
				// Convert unitWeight to base unit for storage:
				// - g -> kg (divide by 1000)
				// - ml -> l (divide by 1000)
				// - half_kg -> kg (divide by 2)
				// - quarter_kg -> kg (divide by 4)
				// - kg, l, pcs, pack, unit -> keep as is
				let unitWeightInBase = v.unitWeight
				if (v.unit === 'g') {
					unitWeightInBase = v.unitWeight / 1000 // Convert grams to kg
				} else if (v.unit === 'ml') {
					unitWeightInBase = v.unitWeight / 1000 // Convert ml to liters
				} else if (v.unit === 'half_kg') {
					unitWeightInBase = v.unitWeight / 2 // Convert half kg to kg
				} else if (v.unit === 'quarter_kg') {
					unitWeightInBase = v.unitWeight / 4 // Convert quarter kg to kg
				}
				
				return {
					label: derivedLabel,
					unitWeight: unitWeightInBase, // Store in base unit (kg for weight, l for volume, or as-is for pcs/pack/unit)
					unit: v.unit, // Keep original unit for display purposes
					sku: v.sku,
					pricePerKg: v.pricePerKg, // Price per base unit (per kg for weight, per liter for volume, per unit for pcs/pack/unit)
					costPerKg: v.costPerKg || 0, // Cost per base unit (for inventory investment calculation)
					stockQty: v.stockQty
				}
			})

			// Derive main price from first variant automatically
			const firstVariant = processedVariants[0]
			const unitLabels: Record<string, string> = {
				kg: 'kg', g: 'g', half_kg: 'half kg', quarter_kg: 'quarter kg',
				l: 'l', ml: 'ml', pcs: 'pcs', pack: 'pack', unit: 'unit'
			}
			const derivedMainPrice = firstVariant?.pricePerKg || null
			const derivedMainPriceUnit = firstVariant?.unit ? (unitLabels[firstVariant.unit] || firstVariant.unit) : null

			// Build badges array
			const badges = ['Wholesale']
			if (isDiscounted && discountPercent > 0) {
				badges.push(`${discountPercent}% OFF`)
			}

			const body = {
				slug,
				title,
				description,
				brand: brand || undefined,
				category: category || undefined,
				subCategory: subCategory || undefined,
				subSubCategory: subSubCategory || undefined,
				badges,
				images,
				moq: 1,
				inStock: true,
				mainPrice: derivedMainPrice || undefined,
				mainPriceUnit: derivedMainPriceUnit || undefined,
				variants: processedVariants,
				tiers: [],
				relatedProducts: relatedProducts.filter(Boolean),
			}
			const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
			const json = await res.json()
			if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to create product')
			toast.success('Product created')
			setTitle(''); setSlug(''); setDescription(''); setBrand(''); setCategory(''); setSubCategory(''); setSubSubCategory(''); setImages([]); setVariants([{ label: '', unitWeight: 1, unit: 'kg', sku: '', pricePerKg: 0, costPerKg: 0, stockQty: 0 }]); setRelatedProducts([]); setIsDiscounted(false); setDiscountPercent(0)
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
						<label className="text-sm font-medium text-gray-700 mb-1.5 block">Title</label>
						<input value={title} onChange={e => handleTitle(e.target.value)} className="input-enhanced" placeholder="e.g. Daal Mash Premium" />
					</div>
					<div className="grid gap-2">
						<label className="text-sm font-medium text-gray-700 mb-1.5 block">Slug</label>
						<input value={slug} onChange={e => setSlug(e.target.value)} className="input-enhanced" placeholder="auto-generated-from-title or enter manually" />
					</div>
					<div className="grid gap-2">
						<label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
						<textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="input-enhanced resize-none" placeholder="Short product description" />
					</div>
					<div className="grid gap-2">
						<div>
							<label className="text-sm font-medium text-gray-700 mb-1.5 block">Brand</label>
							<input value={brand} onChange={e => setBrand(e.target.value)} className="input-enhanced" placeholder="e.g. Local Mill" />
						</div>
						<div>
							<label className="text-sm font-medium text-gray-700 mb-1.5 block">Main Category *</label>
							<select
								value={category}
								onChange={e => setCategory(e.target.value)}
								className="input-enhanced"
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
								<label className="text-sm font-medium text-gray-700 mb-1.5 block">Sub-Category (Optional)</label>
								<select
									value={subCategory}
									onChange={e => setSubCategory(e.target.value)}
									className="input-enhanced"
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
								<label className="text-sm font-medium text-gray-700 mb-1.5 block">Sub-Sub-Category (Optional)</label>
								<select
									value={subSubCategory}
									onChange={e => setSubSubCategory(e.target.value)}
									className="input-enhanced"
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

          <ImageUpload
						images={images}
						onImagesChange={setImages}
						label="Images"
						multiple={true}
					/>
				</div>

				{/* Discount Settings */}
				<div className="rounded-md border p-4 grid gap-3">
					<div className="text-sm font-medium text-gray-700 mb-2">Discount Settings</div>
					<div className="flex items-center gap-4">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={isDiscounted}
								onChange={e => {
									setIsDiscounted(e.target.checked)
									if (!e.target.checked) setDiscountPercent(0)
								}}
								className="w-4 h-4"
							/>
							<span className="text-sm text-gray-700">Display as discounted product</span>
						</label>
						{isDiscounted && (
							<div className="flex items-center gap-2">
								<label className="text-sm text-gray-700">Discount:</label>
								<input
									type="number"
									min="0"
									max="100"
									value={discountPercent}
									onChange={e => setDiscountPercent(Number(e.target.value))}
									className="input-enhanced w-24"
									placeholder="%"
								/>
								<span className="text-sm text-gray-700">%</span>
							</div>
						)}
					</div>
					{isDiscounted && discountPercent > 0 && (
						<p className="text-xs text-gray-500">Product will show "{discountPercent}% OFF" badge</p>
					)}
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
								<div className="text-xs font-medium text-slate-600">
									{idx === 0 ? 'Main Variant' : `Variant ${idx + 1}${idx > 0 ? ' (auto-calculated)' : ''}`}
								</div>
								{variants.length > 1 && (
									<button type="button" onClick={() => removeVariant(idx)} className="text-xs text-red-600 hover:underline">
										Remove
									</button>
								)}
							</div>
							<div className="grid gap-2 sm:grid-cols-2">
								{/* 1. SKU */}
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 block">SKU</label>
									<input 
										value={variant.sku} 
										onChange={e => updateVariant(idx, 'sku', e.target.value)} 
										className="input-enhanced" 
										placeholder="e.g. DAALMASH-10KG" 
									/>
								</div>
								
								{/* 2. Unit */}
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 block">Unit</label>
									<select 
										value={variant.unit} 
										onChange={e => updateVariant(idx, 'unit', e.target.value as any)} 
										className="input-enhanced"
									>
										<option value="kg">kg (Kilogram)</option>
										<option value="half_kg">half kg</option>
										<option value="quarter_kg">quarter kg</option>
										<option value="g">g (Gram)</option>
										<option value="l">l (Liter)</option>
										<option value="ml">ml (Milliliter)</option>
										<option value="pcs">pcs (Pieces)</option>
										<option value="pack">pack</option>
										<option value="unit">unit</option>
									</select>
								</div>
								
								{/* 3. Quantity (how many of that unit) */}
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 block">
										Quantity {variant.unit === 'kg' || variant.unit === 'half_kg' || variant.unit === 'quarter_kg' || variant.unit === 'g' ? '(kg)' : variant.unit === 'l' || variant.unit === 'ml' ? '(liter)' : variant.unit === 'pcs' || variant.unit === 'pack' || variant.unit === 'unit' ? '(pieces)' : ''}
									</label>
									<input 
										type="number" 
										value={variant.unitWeight} 
										onChange={e => updateVariant(idx, 'unitWeight', Number(e.target.value))} 
										className="input-enhanced" 
										placeholder={`e.g. ${variant.unit === 'kg' ? '1' : variant.unit === 'g' ? '1000' : variant.unit === 'l' ? '1' : variant.unit === 'ml' ? '1000' : '1'}`}
									/>
								</div>
								
								{/* 4. Price per selected unit */}
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 block">
										Price per {variant.unit === 'kg' || variant.unit === 'half_kg' || variant.unit === 'quarter_kg' || variant.unit === 'g' ? 'kg' : variant.unit === 'l' || variant.unit === 'ml' ? 'liter' : variant.unit === 'pcs' || variant.unit === 'pack' || variant.unit === 'unit' ? 'unit' : 'unit'} (Rs)
										{idx > 0 && <span className="text-xs text-gray-500 ml-1">(auto, editable)</span>}
									</label>
									<input 
										type="number" 
										value={variant.pricePerKg} 
										onChange={e => updateVariant(idx, 'pricePerKg', Number(e.target.value))} 
										className="input-enhanced" 
										placeholder="e.g. 5000" 
									/>
								</div>
								
								{/* 5. Stock */}
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 block">Stock qty</label>
									<input 
										type="number" 
										value={variant.stockQty} 
										onChange={e => updateVariant(idx, 'stockQty', Number(e.target.value))} 
										className="input-enhanced" 
										placeholder="e.g. 100" 
									/>
								</div>
								
								{/* Cost (hidden by default, can be shown if needed) */}
								<div className="sm:col-span-2">
									<details className="text-xs text-gray-500">
										<summary className="cursor-pointer hover:text-gray-700">Advanced: Cost (Rs) - for internal profit tracking</summary>
										<div className="mt-2">
											<input 
												type="number" 
												value={variant.costPerKg || 0} 
												onChange={e => updateVariant(idx, 'costPerKg', Number(e.target.value))} 
												className="input-enhanced" 
												placeholder="e.g. 4000 (optional)" 
											/>
											{idx > 0 && <span className="text-xs text-gray-500 ml-1">(auto, editable)</span>}
										</div>
									</details>
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
							className="input-enhanced"
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
					<button onClick={onSave} disabled={saving} className="btn-primary animate-fade-in">
						{saving ? 'Saving...' : 'Create product'}
					</button>
				</div>
			</div>
		</div>
	)
}
