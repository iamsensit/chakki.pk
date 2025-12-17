import { NextRequest, NextResponse } from 'next/server'
import { productsQuerySchema, productCreateSchema } from '@/app/lib/validators'
import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import { auth } from '@/app/lib/auth'
import { isAdmin } from '@/app/lib/roles'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET(req: NextRequest) {
	try {
		await connectToDatabase()
		const url = new URL(req.url)
		const parsed = productsQuerySchema.safeParse(Object.fromEntries(url.searchParams))
		if (!parsed.success) {
			return json(false, 'Invalid query', undefined, parsed.error.flatten(), 400)
		}
		const suggest = url.searchParams.get('suggest') === '1'
		const { q, category, brand, sort, page, limit } = parsed.data

		// Robust coercion for filters commonly sent as 0/1
		const inStockRaw = url.searchParams.get('inStock')
		const inStock =
			inStockRaw == null
				? undefined
				: ['1', 'true', 'yes', 'on'].includes(inStockRaw.toLowerCase())
					? true
					: ['0', 'false', 'no', 'off'].includes(inStockRaw.toLowerCase())
						? false
						: (parsed.data as any).inStock

		const minPriceRaw = url.searchParams.get('minPrice')
		const maxPriceRaw = url.searchParams.get('maxPrice')
		const hasMin = minPriceRaw != null && minPriceRaw !== ''
		const hasMax = maxPriceRaw != null && maxPriceRaw !== ''
		const minPrice = hasMin ? Number(minPriceRaw) : undefined
		const maxPrice = hasMax ? Number(maxPriceRaw) : undefined

		const where: any = {}
		if (q) {
			const regex = { $regex: q, $options: 'i' }
			where.$or = [
				{ title: regex },
				{ description: regex },
				{ brand: regex },
				{ category: regex },
				{ 'variants.label': regex },
			]
		}
		if (category) where.category = category
		if (brand) where.brand = brand
		if (typeof inStock === 'boolean') {
			if (inStock) {
				// available if product flag true OR any variant stockQty > 0
				where.$and = (where.$and || []).concat([{
					$or: [
						{ inStock: true },
						{ variants: { $elemMatch: { stockQty: { $gt: 0 } } } }
					]
				}])
			} else {
				where.$and = (where.$and || []).concat([{
					$and: [
						{ inStock: { $ne: true } },
						{ variants: { $not: { $elemMatch: { stockQty: { $gt: 0 } } } } }
					]
				}])
			}
		}
		if (hasMin || hasMax) {
			const gte = hasMin && !Number.isNaN(minPrice as any) ? (minPrice as number) : 0
			const lte = hasMax && !Number.isNaN(maxPrice as any) ? (maxPrice as number) : 9999999
			where.variants = { $elemMatch: { pricePerKg: { $gte: gte, $lte: lte } } }
		}

		let sortObj: any = { popularity: -1 }
		let useAgg = false
		if (sort === 'newest') sortObj = { createdAt: -1 }
		if (sort === 'price_asc' || sort === 'price_desc') {
			useAgg = true
		}

		if (suggest) {
			const items = await Product.find(where, { title: 1, brand: 1, category: 1, images: 1 }).sort(sortObj).limit(8).lean()
			return json(true, 'Suggestions', { items })
		}

		const skip = (page - 1) * limit

		if (useAgg) {
			const pipeline: any[] = [
				{ $match: where },
				{ $addFields: { minPrice: { $min: '$variants.pricePerKg' } } },
				{ $sort: { minPrice: sort === 'price_asc' ? 1 : -1, _id: 1 } },
				{ $skip: skip },
				{ $limit: limit }
			]
			const [items, totalArr] = await Promise.all([
				Product.aggregate(pipeline),
				Product.aggregate([{ $match: where }, { $count: 'total' }])
			])
			const total = totalArr?.[0]?.total ?? 0
			return json(true, 'Products fetched', { items, page, limit, total })
		}

		const [items, total] = await Promise.all([
			Product.find(where).sort(sortObj).skip(skip).limit(limit).lean(),
			Product.countDocuments(where)
		])

		return json(true, 'Products fetched', { items, page, limit, total })
	} catch (err: any) {
		console.error('GET /api/products error', err)
		return json(false, 'Failed to fetch products', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		if (!isAdmin(session)) return json(false, 'Unauthorized', undefined, undefined, 401)
		const body = await req.json()
		const parsed = productCreateSchema.safeParse(body)
		if (!parsed.success) {
			return json(false, 'Invalid body', undefined, parsed.error.flatten(), 400)
		}

		// Normalize and de-duplicate slug server-side
		const data: any = { ...parsed.data }
		// Ensure relatedProducts are stored as ObjectIds (convert strings to ObjectIds)
		if (data.relatedProducts && Array.isArray(data.relatedProducts)) {
			const mongoose = (await import('mongoose')).default
			data.relatedProducts = data.relatedProducts
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
		}
		if (data.slug) {
			const base = String(data.slug)
				.toLowerCase()
				.trim()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9-]/g, '')
				.replace(/-+/g, '-')
				.replace(/^-+|-+$/g, '')
			let candidate = base || 'product'
			let suffix = 2
			// Ensure uniqueness without throwing 11000
			// Try a few times; in practice this will resolve quickly
			// eslint-disable-next-line no-constant-condition
			while (await Product.exists({ slug: candidate })) {
				candidate = `${base}-${suffix++}`
			}
			data.slug = candidate
		}

		const created = await Product.create(data)
		// Convert relatedProducts ObjectIds to strings for response
		if (created && created.relatedProducts && Array.isArray(created.relatedProducts)) {
			(created as any).relatedProducts = created.relatedProducts.map((id: any) => {
				// Handle ObjectId objects - convert to string
				if (id && typeof id === 'object' && id.toString) {
					return String(id)
				}
				// Handle strings
				return String(id || '').trim()
			}).filter(Boolean)
		}
		return json(true, 'Product created', created, undefined, 201)
	} catch (err: any) {
		console.error('POST /api/products error', err)
		// Handle duplicate key (e.g., slug)
		if (err?.code === 11000) {
			const key = Object.keys(err?.keyPattern || {})[0] || 'field'
			return json(false, `${key} already exists`, undefined, { error: 'DUPLICATE', key, value: err?.keyValue?.[key] }, 409)
		}
		return json(false, 'Failed to create product', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'
