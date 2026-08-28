import Link from 'next/link'
import ProductCard from '@/app/components/product/ProductCard'
import ProductFilters from './ProductFilters'
import MobileSearchBar from '@/app/components/home/MobileSearchBar'
import { Filter, X, Tag, Sparkles, ShoppingBag } from 'lucide-react'

// Force dynamic real-time data fetching
export const dynamic = 'force-dynamic'
export const revalidate = 0

function toPlainObject<T>(data: T): T {
	return JSON.parse(JSON.stringify(data))
}

async function fetchProducts(searchParams: Record<string, string | undefined>) {

	const { connectToDatabase } = await import('@/app/lib/mongodb')
	const Product = (await import('@/models/Product')).default
	await connectToDatabase()
	
	const q = searchParams.q?.trim()
	const category = searchParams.category?.trim()
	const subCategory = searchParams.subCategory?.trim()
	const brand = searchParams.brand?.trim()
	const inStock = searchParams.inStock === 'true'
	const onSale = searchParams.onSale === 'true' || searchParams.badge === 'discount'
	const minPrice = searchParams.minPrice ? Number(searchParams.minPrice) : undefined
	const maxPrice = searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined
	const sort = searchParams.sort || 'popularity'
	const page = Number(searchParams.page || 1)
	const limit = Number(searchParams.limit || 24)
	
	let where: any = {}
	
	if (q) {
		const words = q.split(/\s+/).filter(w => w.length > 0)
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
	
	if (category) {
		const Category = (await import('@/models/Category')).default
		// Search in Category collection
		const mainCat = await Category.findOne({
			name: { $regex: new RegExp(`^${category}$`, 'i') },
			$or: [{ level: 0 }, { level: { $exists: false } }, { parentCategory: null }]
		}).lean()

		if (mainCat && (mainCat as any)._id) {
			// Find all subcategories
			const subCats = await Category.find({
				parentCategory: (mainCat as any)._id,
				isActive: { $ne: false }
			}).select('name').lean()

			const categoryNames = [category, ...subCats.map((sc: any) => sc.name)]
			const categoryCondition = {
				$or: [
					{ category: { $in: categoryNames } },
					{ subCategory: { $in: categoryNames } },
					{ subSubCategory: { $in: categoryNames } },
					{ category: { $regex: new RegExp(`^${category}$`, 'i') } }
				]
			}

			if (where.$or) {
				where.$and = (where.$and || []).concat([{ $or: where.$or }, categoryCondition])
				delete where.$or
			} else {
				Object.assign(where, categoryCondition)
			}
		} else {
			// Fallback: match category directly
			const categoryCondition = {
				$or: [
					{ category: { $regex: new RegExp(`^${category}$`, 'i') } },
					{ subCategory: { $regex: new RegExp(`^${category}$`, 'i') } },
					{ subSubCategory: { $regex: new RegExp(`^${category}$`, 'i') } }
				]
			}
			if (where.$or) {
				where.$and = (where.$and || []).concat([{ $or: where.$or }, categoryCondition])
				delete where.$or
			} else {
				Object.assign(where, categoryCondition)
			}
		}
	}

	if (subCategory) {
		where.$and = (where.$and || []).concat([{
			$or: [
				{ subCategory: { $regex: new RegExp(`^${subCategory}$`, 'i') } },
				{ subSubCategory: { $regex: new RegExp(`^${subCategory}$`, 'i') } }
			]
		}])
	}
	
	if (brand) where.brand = brand

	if (onSale) {
		where.$and = (where.$and || []).concat([{
			badges: { $regex: /(% OFF|discount|sale|deal)/i }
		}])
	}
	
	if (inStock) {
		where.$and = (where.$and || []).concat([{
			$or: [
				{ inStock: true },
				{ variants: { $elemMatch: { stockQty: { $gt: 0 } } } }
			]
		}])
	}
	
	if (minPrice !== undefined || maxPrice !== undefined) {
		const gte = minPrice !== undefined ? minPrice : 0
		const lte = maxPrice !== undefined ? maxPrice : 9999999
		where.variants = { $elemMatch: { pricePerKg: { $gte: gte, $lte: lte } } }
	}
	
	let sortObj: any = { popularity: -1, createdAt: -1 }
	let useAgg = false
	if (sort === 'newest') sortObj = { createdAt: -1 }
	if (sort === 'price_asc' || sort === 'price_desc') useAgg = true
	
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
		return toPlainObject({ items, total, page, limit })
	}
	
	const [items, total] = await Promise.all([
		Product.find(where).sort(sortObj).skip(skip).limit(limit).lean(),
		Product.countDocuments(where)
	])
	
	return toPlainObject({ items, total, page, limit })
}

async function fetchMeta() {
	const { connectToDatabase } = await import('@/app/lib/mongodb')
	const Product = (await import('@/models/Product')).default
	const Category = (await import('@/models/Category')).default
	await connectToDatabase()
	
	const [dbCategories, productCategories, brands] = await Promise.all([
		Category.find({ 
			isActive: { $ne: false },
			$or: [{ level: 0 }, { level: { $exists: false } }, { parentCategory: null }]
		}).select('name displayOrder image').sort({ displayOrder: 1, name: 1 }).lean(),
		Product.distinct('category', { category: { $exists: true, $nin: [null, ''] } }),
		Product.distinct('brand', { brand: { $exists: true, $nin: [null, ''] } })
	])
	
	const categoryMap = new Map<string, { name: string; count: number }>()

	for (const cat of dbCategories) {
		if (cat.name) {
			categoryMap.set(String(cat.name).toLowerCase().trim(), {
				name: String(cat.name).trim(),
				count: 0
			})
		}
	}

	for (const pCat of productCategories) {
		if (pCat && typeof pCat === 'string') {
			const key = pCat.toLowerCase().trim()
			if (!categoryMap.has(key)) {
				categoryMap.set(key, { name: pCat.trim(), count: 0 })
			}
		}
	}

	const categoriesWithCounts = await Promise.all(
		Array.from(categoryMap.values()).map(async (c) => {
			const count = await Product.countDocuments({
				$or: [
					{ category: c.name },
					{ subCategory: c.name },
					{ subSubCategory: c.name },
					{ category: { $regex: new RegExp(`^${c.name}$`, 'i') } }
				]
			})
			return { name: c.name, count }
		})
	)
	
	return toPlainObject({
		categories: categoriesWithCounts,
		brands: brands.filter(Boolean) as string[]
	})
}

async function fetchSubCategories(mainCategoryName: string) {
	const { connectToDatabase } = await import('@/app/lib/mongodb')
	const Category = (await import('@/models/Category')).default
	const Product = (await import('@/models/Product')).default
	await connectToDatabase()
	
	const mainCat = await Category.findOne({
		name: { $regex: new RegExp(`^${mainCategoryName}$`, 'i') }
	}).lean()
	
	if (!mainCat || !(mainCat as any)._id) return { subCategories: [], allCount: 0 }
	
	const subCategories = await Category.find({
		parentCategory: (mainCat as any)._id,
		level: 1,
		isActive: { $ne: false }
	}).sort({ displayOrder: 1, name: 1 }).lean()
	
	const subCategoriesWithCounts = await Promise.all(
		subCategories.map(async (subCat: any) => {
			const count = await Product.countDocuments({
				$or: [
					{ subCategory: subCat.name },
					{ subSubCategory: subCat.name },
					{ category: subCat.name }
				]
			})
			return {
				name: String(subCat.name),
				count
			}
		})
	)
	
	const allCount = await Product.countDocuments({
		$or: [
			{ category: mainCategoryName },
			{ subCategory: mainCategoryName }
		]
	})
	
	return toPlainObject({ subCategories: subCategoriesWithCounts, allCount })
}


export default async function ProductsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
	const [{ items, total }, meta] = await Promise.all([
		fetchProducts(searchParams),
		fetchMeta()
	])
	
	const subCategoriesData = searchParams.category ? await fetchSubCategories(searchParams.category) : { subCategories: [], allCount: 0 }
	const subCategories = subCategoriesData.subCategories || []

	const activeChips: { label: string; removeUrl: string }[] = []

	// Build active filter chips for easy removal
	const createRemoveUrl = (keyToRemove: string) => {
		const params = new URLSearchParams()
		Object.entries(searchParams).forEach(([k, v]) => {
			if (k !== keyToRemove && v) params.set(k, v)
		})
		return `/products?${params.toString()}`
	}

	if (searchParams.q) activeChips.push({ label: `Search: "${searchParams.q}"`, removeUrl: createRemoveUrl('q') })
	if (searchParams.category) activeChips.push({ label: `Category: ${searchParams.category}`, removeUrl: createRemoveUrl('category') })
	if (searchParams.subCategory) activeChips.push({ label: `Subcategory: ${searchParams.subCategory}`, removeUrl: createRemoveUrl('subCategory') })
	if (searchParams.brand) activeChips.push({ label: `Brand: ${searchParams.brand}`, removeUrl: createRemoveUrl('brand') })
	if (searchParams.onSale === 'true' || searchParams.badge === 'discount') activeChips.push({ label: 'On Sale Deals', removeUrl: createRemoveUrl('onSale') })
	if (searchParams.inStock === 'true') activeChips.push({ label: 'In Stock', removeUrl: createRemoveUrl('inStock') })
	if (searchParams.minPrice || searchParams.maxPrice) {
		activeChips.push({
			label: `Price: Rs. ${searchParams.minPrice || '0'} - ${searchParams.maxPrice || '∞'}`,
			removeUrl: `/products?${(() => {
				const p = new URLSearchParams()
				Object.entries(searchParams).forEach(([k, v]) => {
					if (k !== 'minPrice' && k !== 'maxPrice' && v) p.set(k, v)
				})
				return p.toString()
			})()}`
		})
	}
	
	return (
		<div className="pb-16 md:pb-0 bg-white min-h-screen">
			{/* Mobile Search Bar */}
			<MobileSearchBar />
			
			<div className="container-pg py-4 sm:py-6">
				<div className="grid gap-6 lg:grid-cols-4 items-start">
					{/* Left: Enhanced Filters Sidebar */}
					<ProductFilters categories={meta.categories} brands={meta.brands} />
					
					{/* Right: Products Area */}
					<section className="lg:col-span-3">
						{/* Page Title & Count Header */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E2E8F0] mb-4">
							<div>
								<h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#2D3748]">
									{searchParams.category ? searchParams.category : 'All Wholesale Products'}
								</h1>
								<p className="text-xs text-[#718096]">
									Showing {items.length} of {total} products available
								</p>
							</div>

							{searchParams.category && (
								<Link
									href="/products"
									className="text-xs font-bold text-[#7EB338] hover:underline"
								>
									View All Categories
								</Link>
							)}
						</div>

						{/* Subcategory Pills Row (if available) */}
						{subCategories.length > 0 && (
							<div className="mb-4">
								<div className="flex flex-wrap gap-2">
									<Link
										href={`/products?category=${encodeURIComponent(searchParams.category || '')}` as any}
										className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
											!searchParams.subCategory
												? 'bg-[#7EB338] text-white shadow-xs'
												: 'bg-slate-100 text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]'
										}`}
									>
										All ({subCategoriesData.allCount || total})
									</Link>
									{subCategories.map((subCat: any) => {
										const isSelected = searchParams.subCategory === subCat.name
										return (
											<Link
												key={subCat.name}
												href={`/products?category=${encodeURIComponent(searchParams.category || '')}&subCategory=${encodeURIComponent(subCat.name)}` as any}
												className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
													isSelected
														? 'bg-[#7EB338] text-white shadow-xs'
														: 'bg-slate-100 text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]'
												}`}
											>
												{subCat.name} {subCat.count > 0 && `(${subCat.count})`}
											</Link>
										)
									})}
								</div>
							</div>
						)}

						{/* Active Filter Chips Bar */}
						{activeChips.length > 0 && (
							<div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 rounded-xl bg-slate-50 border border-[#E2E8F0]">
								<span className="text-xs font-bold text-[#718096] mr-1">Active:</span>
								{activeChips.map((chip) => (
									<Link
										key={chip.label}
										href={chip.removeUrl as any}
										className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#F08C38] text-xs font-semibold text-[#2D3748] hover:text-[#F08C38] transition-colors shadow-xs"
									>
										<span>{chip.label}</span>
										<X className="h-3 w-3" />
									</Link>
								))}
								<Link
									href="/products"
									className="text-xs font-bold text-[#F08C38] hover:underline ml-auto"
								>
									Clear All
								</Link>
							</div>
						)}

						{/* Products Grid */}
						{items.length === 0 ? (
							<div className="bg-slate-50 rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-3 mt-4">
								<div className="h-12 w-12 rounded-full bg-[#F5EFE0] text-[#7EB338] mx-auto flex items-center justify-center">
									<ShoppingBag className="h-6 w-6" />
								</div>
								<h3 className="text-base font-bold text-[#2D3748]">No Products Found</h3>
								<p className="text-xs text-[#718096] max-w-sm mx-auto">
									We couldn&apos;t find any products matching your active filters. Try adjusting your search keywords or clearing filters.
								</p>
								<Link
									href="/products"
									className="inline-block mt-2 px-5 py-2 rounded-full bg-[#7EB338] text-white text-xs font-bold hover:bg-[#6fa02f] transition-colors"
								>
									Show All Products
								</Link>
							</div>
						) : (
							<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
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
