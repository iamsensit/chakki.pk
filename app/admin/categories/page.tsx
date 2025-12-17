"use client"

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Trash2, PencilLine, X } from 'lucide-react'

type Cat = { _id?: string; name: string; count?: number; image?: string; description?: string; displayOrder?: number; isActive?: boolean }

export default function CategoriesAdminPage() {
  const [rows, setRows] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategory, setNewCategory] = useState<Cat>({ name: '', image: '', description: '', displayOrder: 1000, isActive: true })
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null) // Track which category is being edited

  async function load() {
    setLoading(true)
    try {
      // Include product-derived categories for the admin categories page
      const res = await fetch('/api/categories?includeProductDerived=1', { cache: 'no-store' })
      const json = await res.json()
      setRows(json?.data?.categories || [])
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
          image: row.image || '', 
          description: row.description || '',
          displayOrder: row.displayOrder ?? 1000, 
          isActive: row.isActive !== false,
          oldName: oldName !== newName ? oldName : undefined // Pass old name if changed
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
          image: newCategory.image || '', 
          description: newCategory.description || '',
          displayOrder: newCategory.displayOrder ?? 1000, 
          isActive: true 
        })
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to create')
      toast.success('Category created')
      setNewCategory({ name: '', image: '', description: '', displayOrder: 1000, isActive: true })
      setShowNewForm(false)
      load()
    } catch (e:any) {
      toast.error(e.message || 'Create failed')
    }
  }

  async function deleteCategory(idx: number) {
    const row = rows[idx]
    if (!row._id) {
      toast.error('Category ID not found. Please refresh the page.')
      load() // Reload to get the auto-created category with _id
      return
    }
    if (!confirm(`Delete category "${row.name}"? This won't delete products in this category.`)) return
    try {
      const res = await fetch(`/api/categories?id=${row._id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to delete')
      toast.success('Category deleted')
      load()
    } catch (e:any) {
      toast.error(e.message || 'Delete failed')
    }
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
              <label className="text-sm font-medium">Category Name *</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="e.g. Daals, Rice, Spices"
                value={newCategory.name}
                onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              />
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
                <label className="text-sm font-medium">Image URL</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="/images/category.jpg or https://…"
                  value={newCategory.image || ''}
                  onChange={e => setNewCategory(prev => ({ ...prev, image: e.target.value }))}
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
                onClick={() => { setShowNewForm(false); setNewCategory({ name: '', image: '', description: '', displayOrder: 1000, isActive: true }) }}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {rows.map((c, idx) => (
          <div key={c._id || c.name} className="border rounded-md p-4 bg-white">
            <div className="flex items-start gap-4">
              <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                {c.image ? <img src={c.image} alt={c.name} className="object-contain max-h-full max-w-full" /> : <span className="text-xs text-slate-500">no image</span>}
              </div>
              <div className="flex-1 grid gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{c.name} {c.count !== undefined && <span className="text-xs text-slate-500">({c.count} products)</span>}</div>
                    {!editingId && c.description && <div className="text-xs text-slate-600 mt-1">{c.description}</div>}
                  </div>
                  <div className="flex gap-2">
                    {editingId !== (c._id || c.name) && (
                      <button 
                        className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" 
                        onClick={() => setEditingId(c._id || c.name || '')}
                      >
                        <PencilLine className="h-3 w-3" />
                        Edit
                      </button>
                    )}
                    <button 
                      className="flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-red-600 text-sm hover:bg-red-50" 
                      onClick={() => deleteCategory(idx)}
                      disabled={!c._id}
                      title={!c._id ? 'Category will be available after refresh' : 'Delete category'}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {editingId === (c._id || c.name) && (
                  <div className="grid gap-4 border-t pt-3 mt-2">
                    <div>
                      <label className="text-sm font-medium">Category Name *</label>
                      <input
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="e.g. Daals, Rice, Spices"
                        value={c.name}
                        onChange={e => setRows(prev => prev.map((r,i)=> i===idx ? { ...r, name: e.target.value } : r))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        rows={2}
                        placeholder="Category description"
                        value={c.description || ''}
                        onChange={e => setRows(prev => prev.map((r,i)=> i===idx ? { ...r, description: e.target.value } : r))}
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Image URL</label>
                        <input
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          placeholder="/images/category.jpg or https://…"
                          value={c.image || ''}
                          onChange={e => setRows(prev => prev.map((r,i)=> i===idx ? { ...r, image: e.target.value } : r))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Display Order</label>
                        <input
                          type="number"
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          placeholder="1000"
                          value={c.displayOrder ?? 1000}
                          onChange={e => setRows(prev => prev.map((r,i)=> i===idx ? { ...r, displayOrder: Number(e.target.value) } : r))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="flex items-center gap-2 rounded-md bg-brand-accent px-4 py-2 text-white text-sm hover:opacity-90" 
                        onClick={() => {
                          save(idx)
                          setEditingId(null)
                        }}
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </button>
                      <button 
                        className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50" 
                        onClick={() => {
                          setEditingId(null)
                          load() // Reload to reset changes
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {editingId !== (c._id || c.name) && (
                  <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>
                      {c.image ? (
                        <span>Image: <a href={c.image} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">{c.image.length > 40 ? c.image.substring(0, 40) + '...' : c.image}</a></span>
                      ) : (
                        <span>No image set</span>
                      )}
                    </div>
                    <div>
                      Display Order: {c.displayOrder ?? 1000}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No categories found. Create your first category above.
          </div>
        )}
      </div>
    </div>
  )
}


