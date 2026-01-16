"use client"

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'
import ImageUpload from '@/app/components/admin/ImageUpload'

type Variant = { _id?: string; id?: string; label?: string; unitWeight?: number; unit?: 'kg' | 'g' | 'half_kg' | 'quarter_kg' | 'l' | 'ml' | 'pcs' | 'pack' | 'unit'; sku?: string; pricePerKg?: number; costPerKg?: number; stockQty?: number }

export default function EditProductPage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [productId, setProductId] = useState<string>('')

  // editable fields
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [subSubCategory, setSubSubCategory] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [saving, setSaving] = useState(false)
  const [isDiscounted, setIsDiscounted] = useState(false)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [open, setOpen] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<Array<{ name: string; _id?: string; level?: number }>>([])
  const [hierarchicalCategories, setHierarchicalCategories] = useState<any[]>([])
  const [relatedProducts, setRelatedProducts] = useState<string[]>([])
  const [relatedProductsSearch, setRelatedProductsSearch] = useState('')
  const [relatedProductsSuggestions, setRelatedProductsSuggestions] = useState<any[]>([])

  // Load all products on mount
  useEffect(() => {
    async function loadAllProducts() {
      try {
        const res = await fetch(`/api/products?limit=1000`)
        const json = await res.json()
        if (json?.data?.items) {
          setAllProducts(json.data.items)
        }
      } catch (err) {
        console.error('Failed to load products:', err)
      }
    }
    loadAllProducts()
  }, [])

  // Search/filter products
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) { 
        setSuggestions([])
        return 
      }
      try {
        // Search in all products first (client-side)
        const queryLower = query.toLowerCase().trim()
        const filtered = allProducts.filter((p: any) => {
          const title = (p.title || '').toLowerCase()
          const sku = p.variants?.some((v: any) => 
            (v.sku || '').toLowerCase().includes(queryLower)
          )
          return title.includes(queryLower) || sku
        })
        
        // Sort: exact matches first, then partial matches
        const sorted = filtered.sort((a: any, b: any) => {
          const aTitle = (a.title || '').toLowerCase()
          const bTitle = (b.title || '').toLowerCase()
          const aExact = aTitle === queryLower || aTitle.startsWith(queryLower)
          const bExact = bTitle === queryLower || bTitle.startsWith(queryLower)
          
          if (aExact && !bExact) return -1
          if (!aExact && bExact) return 1
          return aTitle.localeCompare(bTitle)
        })
        
        setSuggestions(sorted.slice(0, 20))
      } catch { 
        setSuggestions([]) 
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query, allProducts])

  // Load available categories (hierarchical)
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
    if (!category) {
      setSubCategory('')
      setSubSubCategory('')
    }
  }, [category])
  
  // Reset sub-sub-category when sub-category changes
  useEffect(() => {
    if (!subCategory) {
      setSubSubCategory('')
    }
  }, [subCategory])

  // Search for related products
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!relatedProductsSearch.trim()) { setRelatedProductsSuggestions([]); return }
      try {
        const res = await fetch(`/api/products?suggest=1&q=${encodeURIComponent(relatedProductsSearch)}&limit=10`)
        const json = await res.json()
        const items = (json?.data?.items || []).filter((p: any) => {
          const pid = String(p._id || p.id)
          return pid !== productId && !relatedProducts.includes(pid)
        })
        setRelatedProductsSuggestions(items)
      } catch { setRelatedProductsSuggestions([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [relatedProductsSearch, productId, relatedProducts])

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

  async function loadProduct(id: string) {
    try {
      const res = await fetch(`/api/products/${id}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json?.data) throw new Error('Failed to load product')
      const p = json.data
      setProductId(p._id || p.id)
      setTitle(p.title || '')
      setSlug(p.slug || '')
      setDescription(p.description || '')
      setBrand(p.brand || '')
      setCategory(p.category || '')
      setSubCategory(p.subCategory || '')
      setSubSubCategory(p.subSubCategory || '')
      setImages(Array.isArray(p.images) ? p.images : [])
      
      // Load discount settings from badges
      const discountBadge = Array.isArray(p.badges) ? p.badges.find((b: string) => typeof b === 'string' && b.includes('% OFF')) : null
      if (discountBadge) {
        const match = String(discountBadge).match(/(\d+)% OFF/)
        if (match) {
          setIsDiscounted(true)
          setDiscountPercent(parseInt(match[1]))
        }
      } else {
        setIsDiscounted(false)
        setDiscountPercent(0)
      }
      
      const loadedVariants = Array.isArray(p.variants) ? p.variants : []
      setVariants(loadedVariants.map((v: any) => {
        // Convert back to display unit: kg->kg, g->g (multiply by 1000), l->l, ml->ml (multiply by 1000), half_kg->half_kg (multiply by 2), quarter_kg->quarter_kg (multiply by 4), pcs/pack/unit->as is
        let displayWeight = v.unitWeight || 0
        if (v.unit === 'g') {
          displayWeight = (v.unitWeight || 0) * 1000 // Convert kg back to grams
        } else if (v.unit === 'ml') {
          displayWeight = (v.unitWeight || 0) * 1000 // Convert liters back to ml
        } else if (v.unit === 'half_kg') {
          displayWeight = (v.unitWeight || 0) * 2 // Convert kg back to half kg
        } else if (v.unit === 'quarter_kg') {
          displayWeight = (v.unitWeight || 0) * 4 // Convert kg back to quarter kg
        }
        return {
          _id: v._id || v.id,
          label: v.label,
          unitWeight: displayWeight,
          unit: v.unit || 'kg',
          sku: v.sku,
          pricePerKg: v.pricePerKg,
          costPerKg: v.costPerKg || 0,
          stockQty: v.stockQty,
        }
      }))
      // Convert relatedProducts to strings, handling both ObjectIds and strings
      const relatedIds = Array.isArray(p.relatedProducts) 
        ? p.relatedProducts.map((id: any) => {
            if (typeof id === 'object' && id !== null && id._id) {
              return String(id._id)
            }
            return String(id || '').trim()
          }).filter(Boolean)
        : []
      setRelatedProducts(relatedIds)
      setOpen(true)
    } catch (e: any) {
      toast.error(e.message || 'Could not load product')
    }
  }

  function handleTitle(t: string) {
    setTitle(t)
    if (!slug) setSlug(t.toLowerCase().replace(/\s+/g, '-'))
  }

  // Upload removed; only URL-based images are supported now.

  function addVariant() {
    // Auto-fill price per kg and cost per kg from first variant if available
    const defaultPrice = variants.length > 0 && variants[0].pricePerKg && variants[0].pricePerKg > 0 ? variants[0].pricePerKg : 0
    const defaultCost = variants.length > 0 && variants[0].costPerKg && variants[0].costPerKg > 0 ? variants[0].costPerKg : 0
    setVariants(prev => [...prev, { unitWeight: 1, unit: 'kg', sku: '', pricePerKg: defaultPrice, costPerKg: defaultCost, stockQty: 0 }])
  }

  function removeVariant(index: number) {
    if (variants.length > 1) {
      setVariants(prev => prev.filter((_, i) => i !== index))
    } else {
      toast.error('Product must have at least one variant')
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
            if (mainVariant && mainVariant.pricePerKg !== undefined && mainVariant.pricePerKg !== null && mainVariant.pricePerKg > 0 && areUnitsCompatible(mainVariant.unit || 'kg', newVariant.unit || 'kg')) {
              const mainBaseWeight = getBaseUnitWeight(mainVariant.unitWeight || 1, mainVariant.unit || 'kg')
              const newBaseWeight = getBaseUnitWeight(newVariant.unitWeight || 1, newVariant.unit || 'kg')
              
              if (mainBaseWeight > 0) {
                const ratio = newBaseWeight / mainBaseWeight
                newVariant.pricePerKg = Math.round((mainVariant.pricePerKg || 0) * ratio)
                if (mainVariant.costPerKg && mainVariant.costPerKg > 0) {
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
          if (mainVariant.pricePerKg !== undefined && areUnitsCompatible(mainVariant.unit || 'kg', v.unit || 'kg')) {
            const mainBaseWeight = getBaseUnitWeight(mainVariant.unitWeight || 1, mainVariant.unit || 'kg')
            const variantBaseWeight = getBaseUnitWeight(v.unitWeight || 1, v.unit || 'kg')
            
            if (mainBaseWeight > 0) {
              const ratio = variantBaseWeight / mainBaseWeight
              if (field === 'pricePerKg' && mainVariant.pricePerKg !== undefined) {
                return { ...v, pricePerKg: Math.round(mainVariant.pricePerKg * ratio) }
              } else if (field === 'costPerKg' && mainVariant.costPerKg !== undefined) {
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
        if (mainVariant && mainVariant.pricePerKg !== undefined) {
          return updated.map((v, i) => {
            if (i === 0) return v
            if (areUnitsCompatible(mainVariant.unit || 'kg', v.unit || 'kg')) {
              const mainBaseWeight = getBaseUnitWeight(mainVariant.unitWeight || 1, mainVariant.unit || 'kg')
              const variantBaseWeight = getBaseUnitWeight(v.unitWeight || 1, v.unit || 'kg')
              
              if (mainBaseWeight > 0) {
                const ratio = variantBaseWeight / mainBaseWeight
                if (field === 'pricePerKg' && mainVariant.pricePerKg !== undefined) {
                  return { ...v, pricePerKg: Math.round(mainVariant.pricePerKg * ratio) }
                } else if (field === 'costPerKg' && mainVariant.costPerKg !== undefined) {
                  return { ...v, costPerKg: Math.round((mainVariant.costPerKg || 0) * ratio) }
                }
              }
            }
            return v
          })
        }
      }
      
      return updated
    })
  }

  async function onSave() {
    if (!productId) { toast.error('Select a product'); return }
    if (variants.length === 0) { toast.error('Product must have at least one variant'); return }
    setSaving(true)
    try {
      // Process variants - derive labels and handle unit conversion
      const processedVariants = variants.map(v => {
        const derivedLabel = (v.label && v.label.trim().length > 0)
          ? v.label
          : (v.unitWeight ? `${v.unitWeight}${v.unit === 'g' ? 'g' : 'kg'} bag` : 'Unit')
        
        // Convert unitWeight to base unit for storage:
        // - g -> kg (divide by 1000)
        // - ml -> l (divide by 1000)
        // - half_kg -> kg (divide by 2)
        // - quarter_kg -> kg (divide by 4)
        // - kg, l, pcs, pack, unit -> keep as is
        let unitWeightInBaseUnit = v.unitWeight || 0
        if (v.unit === 'g') {
          unitWeightInBaseUnit = (v.unitWeight || 0) / 1000 // Convert grams to kg
        } else if (v.unit === 'ml') {
          unitWeightInBaseUnit = (v.unitWeight || 0) / 1000 // Convert ml to liters
        } else if (v.unit === 'half_kg') {
          unitWeightInBaseUnit = (v.unitWeight || 0) / 2 // Convert half kg to kg
        } else if (v.unit === 'quarter_kg') {
          unitWeightInBaseUnit = (v.unitWeight || 0) / 4 // Convert quarter kg to kg
        }
        
        return {
          _id: v._id,
          id: v.id,
          label: derivedLabel,
          unitWeight: unitWeightInBaseUnit,
          unit: v.unit || 'kg',
          sku: v.sku || '',
          pricePerKg: v.pricePerKg || 0,
          costPerKg: v.costPerKg || 0,
          stockQty: v.stockQty ?? 0
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

      const body: any = {
        title, slug, description, brand, category, 
        subCategory: subCategory || undefined,
        subSubCategory: subSubCategory || undefined,
        images,
        badges,
        mainPrice: derivedMainPrice || undefined,
        mainPriceUnit: derivedMainPriceUnit || undefined,
        variants: processedVariants,
        relatedProducts: relatedProducts.filter(Boolean).map(id => String(id).trim()),
      }
      console.log('Saving relatedProducts:', body.relatedProducts)
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to update product')
      // Update relatedProducts state with the response data
      if (json?.data?.relatedProducts && Array.isArray(json.data.relatedProducts)) {
        const updatedRelated = json.data.relatedProducts.map((id: any) => {
          if (typeof id === 'object' && id !== null && id._id) {
            return String(id._id)
          }
          return String(id || '').trim()
        }).filter(Boolean)
        setRelatedProducts(updatedRelated)
      }
      toast.success('Product updated')
    } catch (e: any) {
      toast.error(e.message || 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!productId) { toast.error('Select a product'); return }
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to delete product')
      toast.success('Product deleted')
      setOpen(false)
      setProductId('')
      setTitle('')
      setQuery('')
      setVariants([])
    } catch (e: any) {
      toast.error(e.message || 'Could not delete product')
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-2xl font-semibold">Edit product</h1>

      {/* Search */}
      <div className="mt-6 rounded-md border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Find a product</div>
          <button
            type="button"
            onClick={() => setShowAllProducts(!showAllProducts)}
            className="text-xs text-brand-accent hover:underline"
          >
            {showAllProducts ? 'Hide' : 'Show'} All Products ({allProducts.length})
          </button>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title or SKU…"
          className="w-full rounded-md border px-3 py-2 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter' && suggestions[0]) { loadProduct(suggestions[0]._id || suggestions[0].id) } }}
        />
        
        {/* Show all products (collapsed) */}
        {showAllProducts && !query.trim() && (
          <div className="mt-2 max-h-96 overflow-auto rounded-md border divide-y bg-white">
            {allProducts.map((p: any) => (
              <button 
                key={p._id || p.id} 
                onClick={() => {
                  loadProduct(p._id || p.id)
                  setShowAllProducts(false)
                }} 
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                <div className="font-medium">{p.title}</div>
                {p.variants?.[0]?.sku && <div className="text-xs text-gray-500">SKU: {p.variants[0].sku}</div>}
              </button>
            ))}
          </div>
        )}
        
        {/* Show search results (matched products at top) */}
        {query.trim() && suggestions.length > 0 && (
          <div className="mt-2 max-h-96 overflow-auto rounded-md border divide-y bg-white">
            {suggestions.map((p: any) => {
              const title = (p.title || '').toLowerCase()
              const queryLower = query.toLowerCase().trim()
              const isExactMatch = title === queryLower || title.startsWith(queryLower)
              
              return (
                <button 
                  key={p._id || p.id} 
                  onClick={() => {
                    loadProduct(p._id || p.id)
                    setQuery('')
                    setSuggestions([])
                  }} 
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    isExactMatch ? 'bg-yellow-50 hover:bg-yellow-100' : ''
                  }`}
                >
                  <div className="font-medium">{p.title}</div>
                  {p.variants?.[0]?.sku && <div className="text-xs text-gray-500">SKU: {p.variants[0].sku}</div>}
                  {isExactMatch && <div className="text-xs text-green-600 mt-1">✓ Exact match</div>}
                </button>
              )
            })}
          </div>
        )}
        
        {/* No results message */}
        {query.trim() && suggestions.length === 0 && (
          <div className="mt-2 text-sm text-gray-500 px-2">No products found matching "{query}"</div>
        )}
      </div>

      <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <motion.div
            className="relative z-10 w-full max-w-3xl bg-white rounded-lg shadow-lg"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="text-lg font-semibold">Edit product</div>
              <button className="p-1 rounded hover:bg-gray-100" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4 space-y-4">
              <div className="rounded-md border p-4 grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm">Title</label>
              <input value={title} onChange={e => handleTitle(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Slug</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Description
                <span className="text-xs text-gray-500 font-normal ml-2">(Press Enter for new lines)</span>
              </label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => {
                  // Allow Enter key to create new lines
                  if (e.key === 'Enter' && !e.shiftKey) {
                    // Shift+Enter for new line, Enter alone also works in textarea
                    // This is default behavior, but we ensure it works
                  }
                }}
                rows={8} 
                className="rounded-md border px-3 py-2 text-sm resize-y min-h-[120px] font-mono" 
                placeholder="Enter product description here...&#10;Press Enter for new lines.&#10;You can format with line breaks."
                style={{ whiteSpace: 'pre-wrap' }}
              />
              <div className="text-xs text-gray-500 mt-1">
                {description.length} characters
              </div>
            </div>
            <div className="grid gap-2">
              <div>
                <label className="text-sm">Brand</label>
                <input value={brand} onChange={e => setBrand(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm">Main Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
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
                      availableCategories.filter(c => (c.level ?? 0) === 1).map(cat => (
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
                    className="w-full rounded-md border px-3 py-2 text-sm w-24"
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
              <button type="button" onClick={addVariant} className="flex items-center gap-1 text-sm text-brand-accent hover:underline">
                <Plus className="h-4 w-4" />
                Add Variant
              </button>
            </div>
            {variants.map((variant, idx) => (
              <div key={idx} className="rounded-md border p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-medium text-slate-600">
                    {idx === 0 ? 'Main Variant' : `Variant ${idx + 1}${idx > 0 ? ' (auto-calculated)' : ''}`}
                  </div>
                  {variants.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeVariant(idx)} 
                      className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {/* 1. SKU */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">SKU</label>
                    <input 
                      value={variant.sku || ''} 
                      onChange={e => updateVariant(idx, 'sku', e.target.value)} 
                      className="w-full rounded-md border px-3 py-2 text-sm" 
                      placeholder="e.g. DAALMASH-10KG"
                    />
                  </div>
                  
                  {/* 2. Unit */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Unit</label>
                    <select 
                      value={variant.unit || 'kg'} 
                      onChange={e => updateVariant(idx, 'unit', e.target.value as any)} 
                      className="w-full rounded-md border px-3 py-2 text-sm"
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
                      value={variant.unitWeight || 0} 
                      onChange={e => updateVariant(idx, 'unitWeight', Number(e.target.value))} 
                      className="w-full rounded-md border px-3 py-2 text-sm" 
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
                      value={variant.pricePerKg || 0} 
                      onChange={e => updateVariant(idx, 'pricePerKg', Number(e.target.value))} 
                      className="w-full rounded-md border px-3 py-2 text-sm" 
                      placeholder="e.g. 5000"
                    />
                  </div>
                  
                  {/* 5. Stock */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Stock qty</label>
                    <input 
                      type="number" 
                      value={variant.stockQty ?? 0} 
                      onChange={e => updateVariant(idx, 'stockQty', Number(e.target.value))} 
                      className="w-full rounded-md border px-3 py-2 text-sm" 
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
                          className="w-full rounded-md border px-3 py-2 text-sm" 
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
                {relatedProducts.map((id) => {
                  // We'll fetch product details on the fly or store titles
                  return (
                    <div key={id} className="flex items-center gap-2 rounded-md border bg-gray-50 px-2 py-1 text-sm">
                      <span className="text-xs text-slate-600">Product ID: {id.slice(-8)}</span>
                      <button
                        type="button"
                        onClick={() => removeRelatedProduct(id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="text-xs text-slate-500">
              {relatedProducts.length === 0 
                ? 'No related products. If none are added, products from the same category will be shown.'
                : `${relatedProducts.length} related product(s) added.`}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <button 
              onClick={onDelete} 
              className="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-red-600 text-sm hover:bg-red-100 transition-colors"
            >
              Delete Product
            </button>
            <button onClick={onSave} disabled={saving} className="inline-flex items-center rounded-md bg-brand-accent px-3 py-1.5 text-white text-sm hover:opacity-90">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}


