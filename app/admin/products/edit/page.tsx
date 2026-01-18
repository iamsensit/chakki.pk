"use client"

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Edit, Search } from 'lucide-react'
import ImageUpload from '@/app/components/admin/ImageUpload'

type Variant = { _id?: string; id?: string; label?: string; unitWeight?: number; unit?: 'kg' | 'g' | 'half_kg' | 'quarter_kg' | 'l' | 'ml' | 'pcs' | 'pack' | 'unit'; sku?: string; pricePerKg?: number; costPerKg?: number; stockQty?: number }

export default function EditProductPage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
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
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  // Removed suggestions - products filter in real-time from allProducts

  // Load all products for the product list (with pagination since API max limit is 40)
  useEffect(() => {
    let active = true
    async function loadProducts() {
      setProductsLoading(true)
      try {
        const allProductsList: any[] = []
        let page = 1
        let hasMore = true
        const limit = 40 // API max limit
        
        // Fetch all pages
        while (hasMore && active) {
          const res = await fetch(`/api/products?page=${page}&limit=${limit}`, { cache: 'no-store' })
          const json = await res.json()
          
          if (json?.success && json?.data?.items && Array.isArray(json.data.items)) {
            allProductsList.push(...json.data.items)
            // Check if there are more pages
            const total = json?.data?.total || 0
            const currentTotal = allProductsList.length
            hasMore = currentTotal < total && json.data.items.length === limit
            page++
          } else {
            hasMore = false
            if (page === 1) {
              console.error('Failed to load products:', json)
            }
          }
        }
        
        if (active) {
          setAllProducts(allProductsList)
          console.log('Loaded products:', allProductsList.length)
        }
      } catch (err) {
        console.error('Failed to load products:', err)
        if (active) setAllProducts([])
      } finally {
        if (active) setProductsLoading(false)
      }
    }
    loadProducts()
    return () => { active = false }
  }, [])

  // Filter products based on search query - real-time filtering as user types
  const filteredProducts = query.trim()
    ? allProducts.filter((p: any) => {
        const searchTerm = query.toLowerCase().trim()
        const title = (p.title || '').toLowerCase()
        const brand = (p.brand || '').toLowerCase()
        const category = (p.category || '').toLowerCase()
        const sku = p.variants?.some((v: any) => (v.sku || '').toLowerCase().includes(searchTerm))
        // Search in title, brand, category, or SKU
        return title.includes(searchTerm) || brand.includes(searchTerm) || category.includes(searchTerm) || sku
      })
    : allProducts

  // Load available categories (hierarchical)
  useEffect(() => {
    let active = true
    async function load() {
      try {
        // Use relative URL to always call the local API (not production)
        const res = await fetch('/api/categories?hierarchical=1', { cache: 'no-store' })
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
          const flatRes = await fetch('/api/categories', { cache: 'no-store' })
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
          
          
          // If unit or unitWeight changed, copy pricePerKg from main variant (don't multiply by ratio)
          // pricePerKg should be the same for all variants - it's the price PER unit weight
          // The total price is calculated as pricePerKg * unitWeight
          if (index > 0 && (field === 'unit' || field === 'unitWeight')) {
            const mainVariant = prev[0]
            if (mainVariant && mainVariant.pricePerKg !== undefined && mainVariant.pricePerKg !== null && mainVariant.pricePerKg > 0 && areUnitsCompatible(mainVariant.unit || 'kg', newVariant.unit || 'kg')) {
              // Copy pricePerKg directly (same price per unit for all variants)
              newVariant.pricePerKg = mainVariant.pricePerKg || 0
              if (mainVariant.costPerKg && mainVariant.costPerKg > 0) {
                newVariant.costPerKg = mainVariant.costPerKg
              }
            }
          }
          
          return newVariant
        }
        
        // If main variant price/cost changed, copy to all other variants (same pricePerKg for all)
        // pricePerKg is the price PER unit weight, so it should be the same for all variants
        if (index === 0 && (field === 'pricePerKg' || field === 'costPerKg') && i > 0) {
          const mainVariant = { ...prev[0], [field]: value }
          if (mainVariant.pricePerKg !== undefined && areUnitsCompatible(mainVariant.unit || 'kg', v.unit || 'kg')) {
            // Copy pricePerKg directly (same for all variants)
            if (field === 'pricePerKg') {
              return { ...v, pricePerKg: mainVariant.pricePerKg }
            } else if (field === 'costPerKg' && mainVariant.costPerKg !== undefined) {
              return { ...v, costPerKg: mainVariant.costPerKg }
            }
          }
        }
        
        return v
      })
      
      // After updating main variant price/cost, copy to all other variants (same pricePerKg for all)
      // pricePerKg is the price PER unit weight, so it should be the same for all variants
      if (index === 0 && (field === 'pricePerKg' || field === 'costPerKg')) {
        const mainVariant = updated[0]
        if (mainVariant && mainVariant.pricePerKg !== undefined) {
          return updated.map((v, i) => {
            if (i === 0) return v
            if (areUnitsCompatible(mainVariant.unit || 'kg', v.unit || 'kg')) {
              // Copy pricePerKg directly (same for all variants)
              if (field === 'pricePerKg') {
                return { ...v, pricePerKg: mainVariant.pricePerKg }
              } else if (field === 'costPerKg' && mainVariant.costPerKg !== undefined) {
                return { ...v, costPerKg: mainVariant.costPerKg }
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
          : (v.unitWeight ? `${v.unitWeight} ${v.unit === 'g' ? 'g' : 'KG'}` : 'Unit')
        
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

      // Build badges array - only add discount badge if explicitly set
      const badges: string[] = []
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
        <div className="text-sm font-medium mb-2">Find a product</div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title or SKU…"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {/* Products List */}
      <div className="mt-6 rounded-md border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium">
            {query.trim() ? `Search Results (${filteredProducts.length})` : `All Products (${filteredProducts.length})`}
          </div>
          {productsLoading && (
            <div className="text-xs text-gray-500">Loading...</div>
          )}
        </div>
        
        {productsLoading ? (
          <div className="text-center py-8 text-gray-500">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {query.trim() ? 'No products found matching your search.' : 'No products available.'}
            {allProducts.length === 0 && (
              <div className="mt-2 text-xs text-gray-400">
                Check browser console (F12) for API response details.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product: any) => (
              <div
                key={product._id || product.id}
                className="border rounded-lg overflow-hidden hover:shadow-sm transition-shadow bg-white flex items-center gap-4 p-3"
              >
                {/* Small Product Image */}
                <div className="relative w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                
                {/* Product Info - Takes remaining space */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-gray-900 truncate">
                    {product.title}
                  </h3>
                  
                  {/* Price and SKU */}
                  <div className="flex items-center gap-3 mt-1">
                    {product.variants?.[0] && (
                      <div className="text-xs text-gray-600">
                        Rs. {Math.round((product.variants[0].pricePerKg || 0) * (product.variants[0].unitWeight || 1))}
                      </div>
                    )}
                    {product.variants?.[0]?.sku && (
                      <div className="text-xs text-gray-400">
                        SKU: {product.variants[0].sku}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Edit Button */}
                <button
                  onClick={() => loadProduct(product._id || product.id)}
                  className="flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand text-white text-xs font-medium py-2 px-4 rounded transition-colors flex-shrink-0"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </div>
            ))}
          </div>
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
                <span className="text-xs text-gray-500 font-normal ml-2">(Supports multiple languages: English, Urdu, etc.)</span>
              </label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                onPaste={e => {
                  // Allow pasting any text including formatted content from other sources
                  // The paste event is handled normally, but we ensure proper encoding
                  const pastedText = e.clipboardData.getData('text/plain')
                  if (pastedText) {
                    e.preventDefault()
                    const cursorPosition = (e.currentTarget as HTMLTextAreaElement).selectionStart || 0
                    const textBefore = description.substring(0, cursorPosition)
                    const textAfter = description.substring((e.currentTarget as HTMLTextAreaElement).selectionEnd || cursorPosition)
                    setDescription(textBefore + pastedText + textAfter)
                    // Set cursor position after pasted text
                    setTimeout(() => {
                      const textarea = e.currentTarget as HTMLTextAreaElement
                      const newPosition = cursorPosition + pastedText.length
                      textarea.setSelectionRange(newPosition, newPosition)
                    }, 0)
                  }
                }}
                rows={8} 
                className="rounded-md border px-3 py-2 text-sm resize-y min-h-[120px]" 
                placeholder="Enter product description here in any language (English, Urdu, etc.)...&#10;Press Enter for new lines.&#10;You can paste formatted text from other sources."
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', direction: 'auto', unicodeBidi: 'plaintext' }}
                dir="auto"
              />
              <div className="text-xs text-gray-500 mt-1">
                {description.length} characters • Supports all languages and scripts (English, Urdu, Arabic, etc.)
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


