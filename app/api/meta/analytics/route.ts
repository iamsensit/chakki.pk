import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import Order from '@/models/Order'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET() {
	try {
		await connectToDatabase()
		const [ordersCount, productsCount, topProducts] = await Promise.all([
			Order.countDocuments(),
			Product.countDocuments(),
			Product.find({}, { title: 1, popularity: 1 }).sort({ popularity: -1 }).limit(5).lean()
		])
		return json(true, 'Analytics', { ordersCount, productsCount, topProducts })
	} catch (err) {
		console.error('GET /api/meta/analytics error', err)
		return json(false, 'Failed to fetch analytics', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'
