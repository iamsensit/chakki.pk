import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import { auth } from '@/app/lib/auth'
import Cart from '@/models/Cart'
import Product from '@/models/Product'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET() {
	try {
		await connectToDatabase()
		const session = await auth()
		const user = (session as any)?.user
		const userKey = user?.id || user?.email
		if (!userKey) return json(false, 'Unauthorized', undefined, undefined, 401)

		const cart = await Cart.findOne({ $or: [{ userId: userKey }, user?.email ? { userId: user?.email } : {}, user?.id ? { userId: user?.id } : {}] }).lean()
		if (Array.isArray(cart)) return json(true, 'Cart fetched', { items: [] })
		return json(true, 'Cart fetched', { items: (cart as any)?.items ?? [] })
	} catch (err) {
		console.error('GET /api/cart error', err)
		return json(false, 'Failed to fetch cart', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

// Add or increase quantity
export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		const user = (session as any)?.user
		const userKey = user?.id || user?.email
		if (!userKey) return json(false, 'Unauthorized', undefined, undefined, 401)

		const body = await req.json()
		const { productId, variantId, quantity = 1 } = body || {}
		if (!productId || quantity <= 0) return json(false, 'Invalid request', undefined, { error: 'BAD_REQUEST' }, 400)

		// Load product to compute price/title safely
		const product = await Product.findById(productId).lean()
		if (!product || Array.isArray(product)) return json(false, 'Product not found', undefined, undefined, 404)
		const productDoc = product as any
		const variant = (productDoc.variants || []).find((v: any) => String(v._id) === String(variantId)) || productDoc.variants?.[0]
		if (!variant) return json(false, 'Variant not found', undefined, undefined, 404)

		const unitPrice = Math.round((variant.pricePerKg || 0) * (variant.unitWeight || 1))
		const item = {
			productId: String(productDoc._id),
			variantId: variantId ? String(variantId) : undefined,
			title: productDoc.title,
			variantLabel: variant.label,
			image: Array.isArray(productDoc.images) ? productDoc.images[0] : undefined,
			quantity: Number(quantity),
			unitPrice
		}

		let cart = await Cart.findOne({ $or: [{ userId: userKey }, user?.email ? { userId: user?.email } : {}, user?.id ? { userId: user?.id } : {}] })
		if (!cart) {
			await Cart.create({ userId: userKey, items: [item] })
			return json(true, 'Added to cart', { ok: true })
		}
		// Migrate cart owner key if different
		if (cart.userId !== userKey) {
			cart.userId = userKey
		}

		const idx = cart.items.findIndex((i: any) => i.productId === item.productId && String(i.variantId || '') === String(item.variantId || ''))
		if (idx >= 0) {
			cart.items[idx].quantity += item.quantity
		} else {
			cart.items.unshift(item)
		}
		await cart.save()
		return json(true, 'Added to cart', { ok: true })
	} catch (err) {
		console.error('POST /api/cart error', err)
		return json(false, 'Failed to add to cart', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

// Update quantity
export async function PUT(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		const user = (session as any)?.user
		const userKey = user?.id || user?.email
		if (!userKey) return json(false, 'Unauthorized', undefined, undefined, 401)

		const body = await req.json()
		const { productId, variantId, quantity } = body || {}
		if (!productId || typeof quantity !== 'number') return json(false, 'Invalid request', undefined, { error: 'BAD_REQUEST' }, 400)

		const cart = await Cart.findOne({ $or: [{ userId: userKey }, user?.email ? { userId: user?.email } : {}, user?.id ? { userId: user?.id } : {}] })
		if (!cart) return json(true, 'Cart updated', { ok: true })

		const idx = cart.items.findIndex((i: any) => i.productId === String(productId) && String(i.variantId || '') === String(variantId || ''))
		if (idx >= 0) {
			if (quantity <= 0) {
				cart.items.splice(idx, 1)
			} else {
				cart.items[idx].quantity = quantity
			}
			await cart.save()
		}
		return json(true, 'Cart updated', { ok: true })
	} catch (err) {
		console.error('PUT /api/cart error', err)
		return json(false, 'Failed to update cart', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

// Clear (optional)
export async function DELETE() {
	try {
		await connectToDatabase()
		const session = await auth()
		const user = (session as any)?.user
		const userKey = user?.id || user?.email
		if (!userKey) return json(false, 'Unauthorized', undefined, undefined, 401)

		await Cart.findOneAndUpdate({ $or: [{ userId: userKey }, user?.email ? { userId: user?.email } : {}, user?.id ? { userId: user?.id } : {}] }, { $set: { items: [] } }, { upsert: true })
		return json(true, 'Cart cleared')
	} catch (err) {
		console.error('DELETE /api/cart error', err)
		return json(false, 'Failed to clear cart', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'
