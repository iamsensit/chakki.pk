import { NextRequest, NextResponse } from 'next/server'
import { idParamSchema, productUpdateSchema } from '@/app/lib/validators'
import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
	try {
		await connectToDatabase()
		const raw = params.id
		let product: any = null

		// Accept either Mongo ObjectId or slug
		if (/^[0-9a-fA-F]{24}$/.test(raw)) {
			const found = await Product.findById(raw).lean()
			if (found && !Array.isArray(found)) product = found
		}
		if (!product) {
			const found = await Product.findOne({ slug: raw }).lean()
			if (found && !Array.isArray(found)) product = found
		}
		if (!product || Array.isArray(product)) return json(false, 'Product not found', undefined, undefined, 404)
		// Convert relatedProducts ObjectIds to strings for easier handling
		if (product.relatedProducts && Array.isArray(product.relatedProducts)) {
			product.relatedProducts = product.relatedProducts.map((id: any) => {
				// Handle ObjectId objects - convert to string
				if (id && typeof id === 'object' && id.toString) {
					return String(id)
				}
				// Handle strings
				return String(id || '').trim()
			}).filter(Boolean)
		}
		return json(true, 'Product fetched', product)
	} catch (err) {
		console.error('GET /api/products/:id error', err)
		return json(false, 'Failed to fetch product', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		await connectToDatabase()
		const idParsed = idParamSchema.safeParse({ id: params.id })
		if (!idParsed.success) return json(false, 'Invalid id', undefined, idParsed.error.flatten(), 400)
		const body = await req.json()
		const parsed = productUpdateSchema.safeParse(body)
		if (!parsed.success) return json(false, 'Invalid body', undefined, parsed.error.flatten(), 400)
		// Ensure relatedProducts are stored as ObjectIds (convert strings to ObjectIds)
		const updateData: any = { ...parsed.data }
		// Always process relatedProducts if it's in the update data
		if ('relatedProducts' in updateData) {
			if (Array.isArray(updateData.relatedProducts)) {
				const mongoose = (await import('mongoose')).default
				updateData.relatedProducts = updateData.relatedProducts
					.map((id: any) => {
						const idStr = String(id).trim()
						if (!idStr) return null
						// Convert string to ObjectId if it's a valid ObjectId format
						if (mongoose.Types.ObjectId.isValid(idStr)) {
							return new mongoose.Types.ObjectId(idStr)
						}
						return null
					})
					.filter(Boolean)
			} else {
				updateData.relatedProducts = []
			}
		}
		const updated = await Product.findByIdAndUpdate(idParsed.data.id, updateData, { new: true }).lean()
		if (Array.isArray(updated)) return json(false, 'Invalid update result', undefined, undefined, 500)
		// Convert relatedProducts ObjectIds to strings for easier handling
		if (updated && updated.relatedProducts && Array.isArray(updated.relatedProducts)) {
			updated.relatedProducts = updated.relatedProducts.map((id: any) => {
				// Handle ObjectId objects - convert to string
				if (id && typeof id === 'object' && id.toString) {
					return String(id)
				}
				// Handle strings
				return String(id || '').trim()
			}).filter(Boolean)
		}
		return json(true, 'Product updated', updated)
	} catch (err) {
		console.error('PUT /api/products/:id error', err)
		return json(false, 'Failed to update product', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
	try {
		await connectToDatabase()
		const parsed = idParamSchema.safeParse({ id: params.id })
		if (!parsed.success) return json(false, 'Invalid id', undefined, parsed.error.flatten(), 400)
		await Product.findByIdAndDelete(parsed.data.id)
		return json(true, 'Product deleted')
	} catch (err) {
		console.error('DELETE /api/products/:id error', err)
		return json(false, 'Failed to delete product', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'
