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
		
		// Check query parameters
		const url = new URL(req.url)
		const includeProductDerived = url.searchParams.get('includeProductDerived') === '1'
		const parentId = url.searchParams.get('parentId') // Get sub-categories for a specific parent
		const hierarchical = url.searchParams.get('hierarchical') === '1' // Return hierarchical structure
		
		// Load all admin-defined categories with parent info
		const dbCategories = await Category.find({ isActive: { $ne: false } })
			.populate('parentCategory', 'name _id')
			.lean()

		// If parentId is specified, return only sub-categories of that parent
		if (parentId) {
			const subCategories = await Promise.all(
				dbCategories
					.filter((dc: any) => dc.parentCategory && String(dc.parentCategory._id) === parentId)
					.map(async (dc: any) => {
						if (dc.name && !Array.isArray(dc)) {
							const count = await Product.countDocuments({ 
								$or: [
									{ category: dc.name },
									{ subCategory: dc.name },
									{ subSubCategory: dc.name }
								]
							})
							return {
								_id: String(dc._id),
								name: String(dc.name),
								parentCategory: dc.parentCategory ? {
									_id: String(dc.parentCategory._id),
									name: String(dc.parentCategory.name)
								} : null,
								level: Number(dc.level ?? 0),
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
			const filtered = subCategories.filter(Boolean)
				.sort((a: any, b: any) => (a.displayOrder !== b.displayOrder ? a.displayOrder - b.displayOrder : a.name.localeCompare(b.name)))
			return json(true, 'Sub-categories fetched', { categories: filtered })
		}

		// For product creation/edit, return hierarchical structure if requested
		if (hierarchical) {
			// Build hierarchical structure
			const mainCategories = dbCategories.filter((dc: any) => !dc.parentCategory || !dc.parentCategory._id)
			const hierarchicalData = await Promise.all(
				mainCategories.map(async (mainCat: any) => {
					if (!mainCat.name || Array.isArray(mainCat)) return null
					
					const count = await Product.countDocuments({ 
						$or: [
							{ category: mainCat.name },
							{ subCategory: mainCat.name },
							{ subSubCategory: mainCat.name }
						]
					})
					
					// Get sub-categories
					const subCats = dbCategories.filter((sc: any) => 
						sc.parentCategory && String(sc.parentCategory._id) === String(mainCat._id) && sc.level === 1
					)
					
					const subCategoriesData = await Promise.all(
						subCats.map(async (subCat: any) => {
							const subCount = await Product.countDocuments({
								$or: [
									{ subCategory: subCat.name },
									{ subSubCategory: subCat.name }
								]
							})
							
							// Get sub-sub-categories
							const subSubCats = dbCategories.filter((ssc: any) =>
								ssc.parentCategory && String(ssc.parentCategory._id) === String(subCat._id) && ssc.level === 2
							)
							
							const subSubCategoriesData = await Promise.all(
								subSubCats.map(async (subSubCat: any) => {
									const subSubCount = await Product.countDocuments({ subSubCategory: subSubCat.name })
									return {
										_id: String(subSubCat._id),
										name: String(subSubCat.name),
										level: 2,
										count: Number(subSubCount),
										displayOrder: Number(subSubCat.displayOrder ?? 1000)
									}
								})
							)
							
							return {
								_id: String(subCat._id),
								name: String(subCat.name),
								level: 1,
								count: Number(subCount),
								displayOrder: Number(subCat.displayOrder ?? 1000),
								subCategories: subSubCategoriesData.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
							}
						})
					)
					
					return {
						_id: String(mainCat._id),
						name: String(mainCat.name),
						level: 0,
						count: Number(count),
						image: mainCat.image ? String(mainCat.image) : '',
						description: mainCat.description ? String(mainCat.description) : '',
						displayOrder: Number(mainCat.displayOrder ?? 1000),
						isActive: mainCat.isActive !== false,
						subCategories: subCategoriesData
							.filter(Boolean)
							.sort((a: any, b: any) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
					}
				})
			)
			
			const filtered = hierarchicalData
				.filter((c): c is NonNullable<typeof c> => c !== null && !!c.name)
				.sort((a, b) => (a.displayOrder !== b.displayOrder ? a.displayOrder - b.displayOrder : a.name.localeCompare(b.name)))
			
			return json(true, 'Categories fetched', { categories: filtered, hierarchical: true })
		}

		// For product creation/edit, only return admin-defined categories (flat list)
		if (!includeProductDerived) {
			const adminCategories = await Promise.all(
				dbCategories.map(async (dc: any) => {
					if (dc.name && !Array.isArray(dc)) {
						const count = await Product.countDocuments({ 
							$or: [
								{ category: dc.name },
								{ subCategory: dc.name },
								{ subSubCategory: dc.name }
							]
						})
						return {
							_id: String(dc._id),
							name: String(dc.name),
							parentCategory: dc.parentCategory ? {
								_id: String(dc.parentCategory._id),
								name: String(dc.parentCategory.name)
							} : null,
							level: Number(dc.level ?? 0),
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
				.sort((a: any, b: any) => {
					// Sort by level first, then displayOrder, then name
					if (a.level !== b.level) return a.level - b.level
					if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder
					return a.name.localeCompare(b.name)
				})
			
			return json(true, 'Categories fetched', { categories: filtered })
		}

		// For admin categories page - ONLY return categories from Category collection (no auto-creation)
		// Use the dbCategories we already loaded - these are the ONLY categories that should exist
		const allCategories = dbCategories
		
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

// Add or update a category record (name + image + description + displayOrder + isActive + parentCategory)
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase()
    const session = await auth()
    if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)
    const body = await req.json()
    const { 
      name, 
      slug, 
      image = '', 
      description = '', 
      displayOrder = 1000, 
      isActive = true, 
      oldName,
      parentCategoryId = null, // ID of parent category
      level = 0 // 0 = main, 1 = sub, 2 = sub-sub
    } = body || {}
    if (!name || typeof name !== 'string') return json(false, 'Name required', undefined, { field: 'name' }, 400)
    const categorySlug = slug || String(name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const newName = name.trim()
    
    // Validate parent category if provided
    let parentCategory = null
    let actualLevel = level
    if (parentCategoryId) {
      parentCategory = await Category.findById(parentCategoryId)
      if (!parentCategory) {
        return json(false, 'Parent category not found', undefined, { field: 'parentCategoryId' }, 400)
      }
      // Auto-determine level based on parent
      const parentLevel = (parentCategory as any).level ?? 0
      actualLevel = parentLevel + 1
      if (actualLevel > 2) {
        return json(false, 'Maximum category depth is 3 levels (Category > Sub-Category > Sub-Sub-Category)', undefined, { field: 'level' }, 400)
      }
    }
    
    // If oldName is provided and different from newName, update all products
    if (oldName && oldName !== newName) {
      // Find the existing category by old name and parent (if any)
      const existingQuery: any = { name: oldName }
      if (parentCategoryId) {
        existingQuery.parentCategory = parentCategoryId
      } else {
        existingQuery.$or = [{ parentCategory: null }, { parentCategory: { $exists: false } }]
      }
      const existing = await Category.findOne(existingQuery)
      if (existing) {
        // Handle image: if provided (even if empty string), use it; if not provided (undefined), preserve existing
        let imageToSave = ''
        if (image !== undefined && image !== null) {
          // Image is explicitly provided - use it (even if empty string to clear image)
          imageToSave = String(image).trim()
        } else {
          // Image not provided in request - preserve existing
          imageToSave = existing.image ? String(existing.image).trim() : ''
        }
        
        // Update the category name
        const updated = await Category.findByIdAndUpdate(
          existing._id,
          { 
            name: newName, 
            slug: categorySlug, 
            image: imageToSave, 
            description: String(description || ''),
            displayOrder: Number(displayOrder) || 1000, 
            isActive: !!isActive,
            parentCategory: parentCategoryId || null,
            level: actualLevel
          },
          { new: true }
        ).lean()
        
        // Update all products that have the old category name
        await Product.updateMany(
          { category: oldName },
          { $set: { category: newName } }
        )
        await Product.updateMany(
          { subCategory: oldName },
          { $set: { subCategory: newName } }
        )
        await Product.updateMany(
          { subSubCategory: oldName },
          { $set: { subSubCategory: newName } }
        )
        
        if (Array.isArray(updated)) return json(false, 'Invalid update result', undefined, undefined, 500)
        return json(true, 'Category name updated and products updated', { category: updated })
      }
    }
    
    // Normal upsert (create or update by name + parentCategory)
    const query: any = { name: newName }
    if (parentCategoryId) {
      query.parentCategory = parentCategoryId
    } else {
      query.$or = [{ parentCategory: null }, { parentCategory: { $exists: false } }]
    }
    
    // Find existing category to preserve image if not provided
    const existing = await Category.findOne(query).lean()
    
    // Handle image: always use provided image if it exists, otherwise preserve existing
    let imageToSave = ''
    if (image !== undefined && image !== null && String(image).trim() !== '') {
      // Image is provided and not empty - use it
      imageToSave = String(image).trim()
    } else if (existing && (existing as any).image && String((existing as any).image).trim() !== '') {
      // No image provided or empty - preserve existing if it exists
      imageToSave = String((existing as any).image).trim()
    } else {
      // No image provided and no existing image - save empty
      imageToSave = ''
    }
    
    // Log for debugging (only log first 100 chars of image to avoid console spam)
    console.log('Category save - image handling:', { 
      provided: image ? (typeof image === 'string' && image.length > 100 ? image.substring(0, 100) + '...' : image) : null, 
      existing: existing ? ((existing as any).image && String((existing as any).image).length > 100 ? String((existing as any).image).substring(0, 100) + '...' : (existing as any).image) : null, 
      final: imageToSave ? (imageToSave.length > 100 ? imageToSave.substring(0, 100) + '...' : imageToSave) : 'empty',
      finalLength: imageToSave.length 
    })
    
    const updated = await Category.findOneAndUpdate(
      query,
      { 
        name: newName, 
        slug: categorySlug, 
        image: imageToSave, 
        description: String(description || ''),
        displayOrder: Number(displayOrder) || 1000, 
        isActive: !!isActive,
        parentCategory: parentCategoryId || null,
        level: actualLevel
      },
      { upsert: true, new: true }
    ).lean()
    if (Array.isArray(updated)) return json(false, 'Invalid update result', undefined, undefined, 500)
    return json(true, 'Saved', { category: updated })
  } catch (err: any) {
    console.error('POST /api/categories error', err)
    // Handle duplicate key error (same name + parentCategory)
    if (err.code === 11000) {
      return json(false, 'A category with this name already exists at this level', undefined, { field: 'name' }, 400)
    }
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

