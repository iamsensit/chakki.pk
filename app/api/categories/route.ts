import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import Category from '@/models/Category'
import { auth } from '@/app/lib/auth'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET(req: NextRequest) {
	try {
		await connectToDatabase()
		
		// Check if we should include product-derived categories (for admin categories page)
		const url = new URL(req.url)
		const includeProductDerived = url.searchParams.get('includeProductDerived') === '1'
		
		// Load all admin-defined categories
		const dbCategories = await Category.find({ isActive: { $ne: false } }).lean()

		// For product creation/edit, only return admin-defined categories
		if (!includeProductDerived) {
			const adminCategories = await Promise.all(
				dbCategories.map(async (dc: any) => {
					if (dc.name && !Array.isArray(dc)) {
						const count = await Product.countDocuments({ category: dc.name })
						return {
							_id: String(dc._id),
							name: String(dc.name), 
							count: Number(count),
							image: dc.image ? String(dc.image) : '', 
							description: dc.description ? String(dc.description) : '',
							displayOrder: Number(dc.displayOrder ?? 1000),
							isActive: dc.isActive !== false
						}
					}
					return null
				})
			)
			
			const filtered = adminCategories.filter(Boolean)
				.sort((a: any, b: any) => (a.displayOrder !== b.displayOrder ? a.displayOrder - b.displayOrder : a.name.localeCompare(b.name)))
			
			return json(true, 'Categories fetched', { categories: filtered })
		}

		// For admin categories page, include product-derived categories too
		// Get distinct categories from products
		const productCategories = await Product.distinct('category', { category: { $exists: true, $ne: null } })
		
		// Auto-create Category records for product-derived categories that don't exist
		for (const catName of productCategories) {
			const nameStr = String(catName)
			if (!nameStr) continue
			const existing = await Category.findOne({ name: nameStr })
			if (!existing) {
				// Auto-create category from product data
				const slug = nameStr.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
				await Category.create({
					name: nameStr,
					slug,
					image: '',
					description: '',
					displayOrder: 1000,
					isActive: true
				})
			}
		}
		
		// Reload all categories after auto-creating missing ones
		const allCategories = await Category.find({ isActive: { $ne: false } }).lean()
		
		// Count products per category and build response
		const categoriesWithData = await Promise.all(
			allCategories.map(async (dc: any) => {
				if (dc.name && !Array.isArray(dc)) {
					const count = await Product.countDocuments({ category: dc.name })
					return {
						_id: String(dc._id),
						name: String(dc.name), 
						count: Number(count),
						image: dc.image ? String(dc.image) : '', 
						description: dc.description ? String(dc.description) : '',
						displayOrder: Number(dc.displayOrder ?? 1000),
						isActive: dc.isActive !== false
					}
				}
				return null
			})
		)
		
		const merged = categoriesWithData
			.filter((c): c is NonNullable<typeof c> => c !== null && !!c.name)
			.sort((a, b) => (a.displayOrder !== b.displayOrder ? a.displayOrder - b.displayOrder : a.name.localeCompare(b.name)))
		
		return json(true, 'Categories fetched', { categories: merged })
	} catch (err: any) {
		console.error('GET /api/categories error', err)
		return json(false, 'Failed to fetch categories', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

// Add or update a category record (name + image + description + displayOrder + isActive)
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase()
    const session = await auth()
    if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)
    const body = await req.json()
    const { name, slug, image = '', description = '', displayOrder = 1000, isActive = true, oldName } = body || {}
    if (!name || typeof name !== 'string') return json(false, 'Name required', undefined, { field: 'name' }, 400)
    const categorySlug = slug || String(name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const newName = name.trim()
    
    // If oldName is provided and different from newName, update all products
    if (oldName && oldName !== newName) {
      // Find the existing category by old name
      const existing = await Category.findOne({ name: oldName })
      if (existing) {
        // Update the category name
        const updated = await Category.findByIdAndUpdate(
          existing._id,
          { 
            name: newName, 
            slug: categorySlug, 
            image: String(image || ''), 
            description: String(description || ''),
            displayOrder: Number(displayOrder) || 1000, 
            isActive: !!isActive 
          },
          { new: true }
        ).lean()
        
        // Update all products that have the old category name
        await Product.updateMany(
          { category: oldName },
          { $set: { category: newName } }
        )
        
        if (Array.isArray(updated)) return json(false, 'Invalid update result', undefined, undefined, 500)
        return json(true, 'Category name updated and products updated', { category: updated })
      }
    }
    
    // Normal upsert (create or update by name)
    const updated = await Category.findOneAndUpdate(
      { name: newName },
      { 
        name: newName, 
        slug: categorySlug, 
        image: String(image || ''), 
        description: String(description || ''),
        displayOrder: Number(displayOrder) || 1000, 
        isActive: !!isActive 
      },
      { upsert: true, new: true }
    ).lean()
    if (Array.isArray(updated)) return json(false, 'Invalid update result', undefined, undefined, 500)
    return json(true, 'Saved', { category: updated })
  } catch (err) {
    console.error('POST /api/categories error', err)
    return json(false, 'Failed to save category', undefined, { error: 'SERVER_ERROR' }, 500)
  }
}

// Delete a category
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase()
    const session = await auth()
    if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return json(false, 'Category ID required', undefined, undefined, 400)
    await Category.findByIdAndDelete(id)
    return json(true, 'Category deleted')
  } catch (err) {
    console.error('DELETE /api/categories error', err)
    return json(false, 'Failed to delete category', undefined, { error: 'SERVER_ERROR' }, 500)
  }
}

