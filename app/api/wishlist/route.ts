import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import Wishlist from '@/models/Wishlist'

// GET - Get user's wishlist
export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
		}

		await connectToDatabase()
		const userId = session.user.id || session.user.email

		let wishlist = await Wishlist.findOne({ userId }).lean()
		if (!wishlist) {
			wishlist = await Wishlist.create({ userId, products: [] })
		}

		return NextResponse.json({ success: true, data: wishlist })
	} catch (error: any) {
		console.error('Error fetching wishlist:', error)
		return NextResponse.json({ success: false, message: error.message }, { status: 500 })
	}
}

// POST - Add or Toggle product in wishlist
export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
		}

		await connectToDatabase()
		const body = await request.json()
		const { productId, variantId, action } = body

		if (!productId) {
			return NextResponse.json({ success: false, message: 'productId required' }, { status: 400 })
		}

		const userId = session.user.id || session.user.email

		let wishlist = await Wishlist.findOne({ userId })
		if (!wishlist) {
			wishlist = new Wishlist({ userId, products: [] })
		}

		// Check if already in wishlist with string matching
		const existingIndex = wishlist.products.findIndex(
			(p: any) => String(p.productId) === String(productId) && (!variantId || String(p.variantId) === String(variantId))
		)

		if (existingIndex >= 0) {
			if (action === 'remove' || action === 'toggle') {
				// Remove from wishlist
				wishlist.products.splice(existingIndex, 1)
				await wishlist.save()
				return NextResponse.json({ success: true, action: 'removed', data: wishlist })
			}
			// Already in wishlist
			return NextResponse.json({ success: true, action: 'exists', data: wishlist })
		}

		if (action === 'remove') {
			return NextResponse.json({ success: true, action: 'not_found', data: wishlist })
		}

		// Add to wishlist
		wishlist.products.push({
			productId: String(productId),
			variantId: variantId ? String(variantId) : null,
			addedAt: new Date()
		})

		await wishlist.save()

		return NextResponse.json({ success: true, action: 'added', data: wishlist })
	} catch (error: any) {
		console.error('Error adding to wishlist:', error)
		return NextResponse.json({ success: false, message: error.message }, { status: 500 })
	}
}

// DELETE - Remove product from wishlist
export async function DELETE(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
		}

		await connectToDatabase()
		const { searchParams } = new URL(request.url)
		const productId = searchParams.get('productId')
		const variantId = searchParams.get('variantId')

		if (!productId) {
			return NextResponse.json({ success: false, message: 'productId required' }, { status: 400 })
		}

		const userId = session.user.id || session.user.email

		const wishlist = await Wishlist.findOne({ userId })
		if (!wishlist) {
			return NextResponse.json({ success: true, data: { products: [] } })
		}

		wishlist.products = wishlist.products.filter(
			(p: any) => !(String(p.productId) === String(productId) && (!variantId || String(p.variantId) === String(variantId)))
		)

		await wishlist.save()

		return NextResponse.json({ success: true, data: wishlist })
	} catch (error: any) {
		console.error('Error removing from wishlist:', error)
		return NextResponse.json({ success: false, message: error.message }, { status: 500 })
	}
}
