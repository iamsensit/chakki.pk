"use client"

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Trash2, PencilLine, X } from 'lucide-react'
import ImageUpload from '@/app/components/admin/ImageUpload'

type Cat = { 
  _id?: string
  name: string
  count?: number
  image?: string
  description?: string
  displayOrder?: number
  isActive?: boolean
  parentCategory?: { _id: string; name: string } | null
  level?: number
  subCategories?: Cat[]
}

export default function CategoriesAdminPage() {
  const [rows, setRows] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategory, setNewCategory] = useState<Cat>({ name: '', image: '', description: '', displayOrder: 1000, isActive: true, level: 0 })
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mainCategories, setMainCategories] = useState<Cat[]>([])

  async function load() {
    setLoading(true)
    try {
      // Load hierarchical structure
      const res = await fetch('/api/categories?includeProductDerived=1&hierarchical=1', { cache: 'no-store' })
      const json = await res.json()
      if (json?.data?.hierarchical) {
        setRows(json.data.categories || [])
      } else {
        const flatRes = await fetch('/api/categories?includeProductDerived=1', { cache: 'no-store' })
        const flatJson = await flatRes.json()
        setRows(flatJson?.data?.categories || [])
      }
      
      // Load main categories for parent selection
      const mainRes = await fetch('/api/categories?hierarchical=1', { cache: 'no-store' })
      const mainJson = await mainRes.json()
      setMainCategories(mainJson?.data?.categories || [])
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function save(idx: number) {
    const row = rows[idx]
    if (!row.name?.trim()) {
      toast.error('Category name is required')
      return
    }
    try {
      const originalRow = rows.find((r, i) => i === idx)
      const oldName = originalRow?.name || ''
      const newName = row.name.trim()
      const slug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName, 
          slug,
          image: row.image ? String(row.image).trim() : '', 
          description: row.description || '',
          displayOrder: row.displayOrder ?? 1000, 
          isActive: row.isActive !== false,
          oldName: oldName !== newName ? oldName : undefined,
          parentCategoryId: row.parentCategory?._id || null,
          level: row.level ?? 0
        })
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to save')
      toast.success('Category saved')
      load()
    } catch (e:any) {
      toast.error(e.message || 'Save failed')
    }
  }

  async function createNew() {
    if (!newCategory.name?.trim()) {
      toast.error('Category name is required')
      return
    }
    try {
      const slug = newCategory.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newCategory.name.trim(), 
          slug,
          image: newCategory.image ? String(newCategory.image).trim() : '', 
          description: newCategory.description || '',
          displayOrder: newCategory.displayOrder ?? 1000, 
          isActive: true,
          parentCategoryId: newCategory.parentCategory?._id || null,
          level: newCategory.level ?? 0
        })
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to create')
      toast.success('Category created')
      setNewCategory({ name: '', image: '', description: '', displayOrder: 1000, isActive: true, level: 0 })
      setShowNewForm(false)
      load()
    } catch (e:any) {
      toast.error(e.message || 'Create failed')
    }
  }
  
  function getAllCategoriesFlat(cats: Cat[]): Cat[] {
    const result: Cat[] = []
    function traverse(categoryList: Cat[]) {
      for (const cat of categoryList) {
        result.push(cat)
        if (cat.subCategories && cat.subCategories.length > 0) {
          traverse(cat.subCategories)
        }
      }
    }
    traverse(cats)
    return result
  }

  async function deleteCategory(catId: string) {
    if (!catId) {
      toast.error('Category ID not found. Please refresh the page.')
      load()
      return
    }
    if (!confirm(`Delete this category? This won't delete products in this category.`)) return
    try {
      const res = await fetch(`/api/categories?id=${catId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to delete')
      toast.success('Category deleted')
      load()
    } catch (e:any) {
      toast.error(e.message || 'Delete failed')
    }
  }

  function renderCategory(cat: Cat, level: number = 0): JSX.Element {
    const flatCats = getAllCategoriesFlat(rows)
    const idx = flatCats.findIndex(c => c._id === cat._id || c.name === cat.name)
    const isEditing = editingId === (cat._id || cat.name)
    
    return (
      <div key={cat._id || cat.name} className="border rounded-md p-4 bg-white" style={{ marginLeft: `${level * 24}px` }}>
        <div className="flex items-start gap-4">
          <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
            {cat.image ? <img src={cat.image} alt={cat.name} className="object-contain max-h-full max-w-full" /> : <span className="text-xs text-slate-500">no image</span>}
          </div>
          <div className="flex-1 grid gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">
                  {level > 0 && '└─ '}
                  {cat.name} 
                  {cat.count !== undefined && <span className="text-xs text-slate-500"> ({cat.count} products)</span>}
                  {cat.level !== undefined && cat.level > 0 && (
                    <span className="text-xs text-gray-400 ml-2">
                      {cat.level === 1 ? '(Sub)' : '(Sub-Sub)'}
                    </span>
                  )}
                </div>
                {!isEditing && cat.description && <div className="text-xs text-slate-600 mt-1">{cat.description}</div>}
              </div>
              <div className="flex gap-2">
                {!isEditing && (
                  <button 
                    className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" 
                    onClick={() => setEditingId(cat._id || cat.name || '')}
                  >
                    <PencilLine className="h-3 w-3" />
                    Edit
                  </button>
                )}
                <button 
                  className="flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-red-600 text-sm hover:bg-red-50" 
                  onClick={() => deleteCategory(cat._id || '')}
                  disabled={!cat._id}
                  title={!cat._id ? 'Category will be available after refresh' : 'Delete category'}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            {isEditing && (
              <div className="grid gap-4 border-t pt-3 mt-2">
                <div>
                  <label className="text-sm font-medium">Parent Category</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={cat.parentCategory?._id || ''}
                    onChange={e => {
                      const parentId = e.target.value
                      if (parentId) {
                        const flatCats = getAllCategoriesFlat(mainCategories)
                        const parent = flatCats.find(c => c._id === parentId)
                        if (parent && parent._id !== cat._id) {
                          const parentLevel = parent.level ?? 0
                          setRows(prev => {
                            const flat = getAllCategoriesFlat(prev)
                            const flatIdx = flat.findIndex(c => (c._id || c.name) === (cat._id || cat.name))
                            if (flatIdx >= 0) {
                              flat[flatIdx] = {
                                ...flat[flatIdx],
                                parentCategory: { _id: parentId, name: parent.name },
                                level: parentLevel + 1
                              }
                            }
                            return prev // Simplified - will reload after save
                          })
                        }
                      } else {
                        setRows(prev => {
                          const flat = getAllCategoriesFlat(prev)
                          const flatIdx = flat.findIndex(c => (c._id || c.name) === (cat._id || cat.name))
                          if (flatIdx >= 0) {
                            flat[flatIdx] = {
                              ...flat[flatIdx],
                              parentCategory: null,
                              level: 0
                            }
                          }
                          return prev
                        })
                      }
                    }}
                  >
                    <option value="">None (Main Category)</option>
                    {getAllCategoriesFlat(mainCategories)
                      .filter(c => c._id !== cat._id)
                      .map(c => {
                        const indent = '  '.repeat(c.level ?? 0)
                        return (
                          <option key={c._id} value={c._id}>
                            {indent}{c.name} {c.level === 0 ? '(Main)' : c.level === 1 ? '(Sub)' : '(Sub-Sub)'}
                          </option>
                        )
                      })}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Category Name *</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="e.g. Daals, Rice, Spices"
                    value={cat.name}
                    onChange={e => {
                      const flat = getAllCategoriesFlat(rows)
                      const flatIdx = flat.findIndex(c => (c._id || c.name) === (cat._id || cat.name))
                      if (flatIdx >= 0) {
                        flat[flatIdx].name = e.target.value
                        setRows([...rows]) // Trigger re-render
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Category description"
                    value={cat.description || ''}
                    onChange={e => {
                      const flat = getAllCategoriesFlat(rows)
                      const flatIdx = flat.findIndex(c => (c._id || c.name) === (cat._id || cat.name))
                      if (flatIdx >= 0) {
                        flat[flatIdx].description = e.target.value
                        setRows([...rows])
                      }
                    }}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <ImageUpload
                      images={cat.image ? [cat.image] : []}
                      onImagesChange={(images) => {
                        const flat = getAllCategoriesFlat(rows)
                        const flatIdx = flat.findIndex(c => (c._id || c.name) === (cat._id || cat.name))
                        if (flatIdx >= 0) {
                          flat[flatIdx].image = images[0] || ''
                          setRows([...rows])
                        }
                      }}
                      label="Category Image"
                      multiple={false}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Display Order</label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="1000"
                      value={cat.displayOrder ?? 1000}
                      onChange={e => {
                        const flat = getAllCategoriesFlat(rows)
                        const flatIdx = flat.findIndex(c => (c._id || c.name) === (cat._id || cat.name))
                        if (flatIdx >= 0) {
                          flat[flatIdx].displayOrder = Number(e.target.value)
                          setRows([...rows])
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="flex items-center gap-2 rounded-md bg-brand-accent px-4 py-2 text-white text-sm hover:opacity-90" 
                    onClick={() => {
                      const flat = getAllCategoriesFlat(rows)
                      const flatIdx = flat.findIndex(c => (c._id || c.name) === (cat._id || cat.name))
                      if (flatIdx >= 0) {
                        save(flatIdx)
                        setEditingId(null)
                      }
                    }}
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                  <button 
                    className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50" 
                    onClick={() => {
                      setEditingId(null)
                      load()
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {!isEditing && (
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-500">
                <div>
                  {cat.image ? (
                    <span>Image: <a href={cat.image} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">{cat.image.length > 40 ? cat.image.substring(0, 40) + '...' : cat.image}</a></span>
                  ) : (
                    <span>No image set</span>
                  )}
                </div>
                <div>
                  Display Order: {cat.displayOrder ?? 1000}
                </div>
              </div>
            )}
          </div>
        </div>
        {cat.subCategories && cat.subCategories.length > 0 && (
          <div className="mt-4 space-y-2">
            {cat.subCategories.map(subCat => renderCategory(subCat, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="mx-auto w-full max-w-5xl p-6">Loading…</div>

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-white text-sm hover:bg-brand-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {showNewForm && (
        <div className="mb-6 border rounded-md p-4 bg-gray-50">
          <h2 className="font-medium mb-4">Create New Category</h2>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Parent Category (Optional)</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={newCategory.parentCategory?._id || ''}
                onChange={e => {
                  const parentId = e.target.value
                  if (parentId) {
                    const flatCats = getAllCategoriesFlat(mainCategories)
                    const parent = flatCats.find(c => c._id === parentId)
                    if (parent) {
                      const parentLevel = parent.level ?? 0
                      setNewCategory(prev => ({
                        ...prev,
                        parentCategory: { _id: parentId, name: parent.name },
                        level: parentLevel + 1
                      }))
                    }
                  } else {
                    setNewCategory(prev => ({
                      ...prev,
                      parentCategory: undefined,
                      level: 0
                    }))
                  }
                }}
              >
                <option value="">None (Main Category)</option>
                {getAllCategoriesFlat(mainCategories).map(cat => {
                  const indent = '  '.repeat(cat.level ?? 0)
                  return (
                    <option key={cat._id} value={cat._id}>
                      {indent}{cat.name} {cat.level === 0 ? '(Main)' : cat.level === 1 ? '(Sub)' : '(Sub-Sub)'}
                    </option>
                  )
                })}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select a parent category to create a sub-category. Leave empty for a main category.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Category Name *</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder={newCategory.level === 0 ? "e.g. Whole Grains & Pulses" : newCategory.level === 1 ? "e.g. Pulses" : "e.g. With Peals"}
                value={newCategory.name}
                onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              />
              {newCategory.level !== undefined && newCategory.level > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Creating a {newCategory.level === 1 ? 'sub-category' : 'sub-sub-category'}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                rows={2}
                placeholder="Category description"
                value={newCategory.description || ''}
                onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <ImageUpload
                  images={newCategory.image ? [newCategory.image] : []}
                  onImagesChange={(images) => setNewCategory(prev => ({ ...prev, image: images[0] || '' }))}
                  label="Category Image"
                  multiple={false}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Display Order</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="1000"
                  value={newCategory.displayOrder ?? 1000}
                  onChange={e => setNewCategory(prev => ({ ...prev, displayOrder: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createNew}
                className="flex items-center gap-2 rounded-md bg-brand-accent px-4 py-2 text-white text-sm hover:opacity-90"
              >
                <Save className="h-4 w-4" />
                Create Category
              </button>
              <button
                onClick={() => { setShowNewForm(false); setNewCategory({ name: '', image: '', description: '', displayOrder: 1000, isActive: true, level: 0 }) }}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {rows.map(cat => renderCategory(cat, 0))}
        {rows.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No categories found. Create your first category above.
          </div>
        )}
      </div>
    </div>
  )
}
