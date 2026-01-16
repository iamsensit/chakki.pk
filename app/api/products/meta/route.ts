import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET() {
	try {
		await connectToDatabase()
		const [categories, brands] = await Promise.all([
			Product.distinct('category'),
			Product.distinct('brand')
		])
		return json(true, 'Meta', { categories: categories.filter(Boolean), brands: brands.filter(Boolean) })
	} catch (err) {
		console.error('GET /api/products/meta error', err)
		return json(false, 'Failed to fetch meta', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'
