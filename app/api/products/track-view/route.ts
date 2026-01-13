import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import { incrementProductView } from '@/app/lib/productAnalytics'

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { productId } = body
		
		if (!productId) {
			return NextResponse.json({ success: false, message: 'Product ID required' }, { status: 400 })
		}
		
		await incrementProductView(productId)
		
		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Error tracking product view:', error)
		return NextResponse.json({ success: false, message: 'Failed to track view' }, { status: 500 })
	}
}

