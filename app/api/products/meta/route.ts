import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import Category from '@/models/Category'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET() {
	try {
		await connectToDatabase()
		
		// Fetch all categories from Category collection (all levels: main, sub, sub-sub)
		const allCategories = await Category.find({ isActive: { $ne: false } })
			.select('name level')
			.lean()
		
		// Extract unique category names from all levels
		const categoryNames = [...new Set(allCategories.map((cat: any) => cat.name).filter(Boolean))]
		
		// Also get categories from products (for backward compatibility)
		const productCategories = await Product.distinct('category')
		
		// Combine and deduplicate
		const allCategoryNames = [...new Set([...categoryNames, ...productCategories].filter(Boolean))]
		
		// Sort alphabetically
		allCategoryNames.sort()
		
		// Get brands from products
		const brands = await Product.distinct('brand')
		
		return json(true, 'Meta', { 
			categories: allCategoryNames, 
			brands: brands.filter(Boolean).sort() 
		})
	} catch (err) {
		console.error('GET /api/products/meta error', err)
		return json(false, 'Failed to fetch meta', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'
