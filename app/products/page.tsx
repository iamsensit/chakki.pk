import Link from 'next/link'
import ProductCard from '@/app/components/product/ProductCard'
import ProductFilters from './ProductFilters'
import MobileSearchBar from '@/app/components/home/MobileSearchBar'

async function fetchProducts(searchParams: Record<string, string | undefined>) {
	// Use direct database query instead of HTTP fetch for better performance
	const { connectToDatabase } = await import('@/app/lib/mongodb')
	const Product = (await import('@/models/Product')).default
	await connectToDatabase()
	
	const { productsQuerySchema } = await import('@/app/lib/validators')
	const parsed = productsQuerySchema.safeParse({
		q: searchParams.q,
		category: searchParams.category,
		brand: searchParams.brand,
		inStock: searchParams.inStock === 'true' ? true : searchParams.inStock === 'false' ? false : undefined,
		minPrice: searchParams.minPrice,
		maxPrice: searchParams.maxPrice,
		sort: searchParams.sort,
		page: searchParams.page ?? '1',
		limit: searchParams.limit ?? '20',
	})
	
	if (!parsed.success) {
		return { items: [], total: 0, page: 1, limit: 20 }
	}
	
	const { q, category, brand, inStock, minPrice, maxPrice, sort, page, limit } = parsed.data
	let where: any = {}
	
	if (q) {
		const words = q.trim().split(/\s+/).filter(w => w.length > 0)
		if (words.length > 0) {
			const allConditions: any[] = []
			words.forEach(word => {
				const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
				const regex = { $regex: escapedWord, $options: 'i' }
				allConditions.push(
					{ title: regex },
					{ description: regex },
					{ brand: regex },
					{ category: regex },
					{ subCategory: regex },
					{ subSubCategory: regex },
					{ 'variants.label': regex }
				)
			})
			where.$or = allConditions
		}
	}
	if (category) where.category = category
	if (brand) where.brand = brand
	if (typeof inStock === 'boolean') {
		if (inStock) {
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
	if (minPrice !== undefined || maxPrice !== undefined) {
		const gte = minPrice !== undefined ? minPrice : 0
		const lte = maxPrice !== undefined ? maxPrice : 9999999
		where.variants = { $elemMatch: { pricePerKg: { $gte: gte, $lte: lte } } }
	}
	
	let sortObj: any = { popularity: -1 }
	let useAgg = false
	if (sort === 'newest') sortObj = { createdAt: -1 }
	if (sort === 'price_asc' || sort === 'price_desc') {
		useAgg = true
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
		return { items, total, page, limit }
	}
	
	const [items, total] = await Promise.all([
		Product.find(where).sort(sortObj).skip(skip).limit(limit).lean(),
		Product.countDocuments(where)
	])
	
	return { items, total, page, limit }
}

async function fetchMeta() {
	// Use direct database query instead of HTTP fetch for better performance
	const { connectToDatabase } = await import('@/app/lib/mongodb')
	const Product = (await import('@/models/Product')).default
	const Category = (await import('@/models/Category')).default
	await connectToDatabase()
	
	// Fetch all categories from Category collection (not just from products)
	// This ensures all admin-defined categories are shown, even if they have no products yet
	// Only fetch top-level categories (level 0) for the filter dropdown
	const [dbCategories, productCategories, brands] = await Promise.all([
		Category.find({ 
			isActive: { $ne: false },
			$or: [
				{ level: 0 },
				{ level: { $exists: false } },
				{ parentCategory: { $exists: false } },
				{ parentCategory: null }
			]
		})
			.select('name displayOrder')
			.sort({ displayOrder: 1, name: 1 })
			.lean()
			.then(cats => cats.map((c: any) => String(c.name)).filter(Boolean)),
		Product.distinct('category').then(cats => cats.filter(Boolean)),
		Product.distinct('brand').then(brands => brands.filter(Boolean))
	])
	
	// Combine admin categories with product categories, removing duplicates
	// Prioritize admin-defined categories order
	const categorySet = new Set(dbCategories)
	productCategories.forEach(cat => categorySet.add(cat))
	
	// Sort: admin categories first (in their display order), then product categories alphabetically
	const allCategories = [
		...dbCategories,
		...productCategories.filter(cat => !dbCategories.includes(cat))
	]
	
	return { categories: allCategories, brands }
}

// Enable ISR (Incremental Static Regeneration) for better performance
export const revalidate = 60

export default async function ProductsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
	const [{ items, total }, meta] = await Promise.all([fetchProducts(searchParams), fetchMeta()])
	return (
		<div className="pb-16 md:pb-0">
			{/* Mobile Search Bar - Only visible on mobile */}
			<MobileSearchBar />
			
			<div className="container-pg py-2 sm:py-4 md:py-6">
				<div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
					<ProductFilters categories={meta.categories} brands={meta.brands} />
					<section className="lg:col-span-3">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
							<h1 className="text-lg sm:text-xl md:text-2xl font-semibold">All Products</h1>
							<div className="text-xs sm:text-sm text-slate-600">{total} results</div>
						</div>
					{items.length === 0 ? (
						<div className="mt-6 sm:mt-10  border p-6 sm:p-8 text-center text-sm sm:text-base text-slate-600">No products found. Try adjusting filters or keywords.</div>
					) : (
						<div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
							{items.map((p: any, i: number) => (
								<ProductCard 
									key={p.id ?? p._id ?? i}
									id={p.id ?? String(p._id)} 
									title={p.title} 
									description={p.description} 
									badges={p.badges} 
									images={p.images} 
									variants={p.variants}
									href={`/products/${p.slug ?? (p.id ?? p._id)}`}
								/>
							))}
						</div>
					)}
					</section>
				</div>
			</div>
		</div>
	)
}
