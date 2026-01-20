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
		subCategory: searchParams.subCategory,
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
	
	const { q, category, subCategory, brand, inStock, minPrice, maxPrice, sort, page, limit } = parsed.data
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
	
	// Handle category filtering - include products from main category AND all subcategories
	// If subCategory is specified, filter to just that subcategory
	if (category) {
		if (subCategory) {
			// If subcategory is specified, filter to just that subcategory
			// Products can have subcategory name in category, subCategory, or subSubCategory fields
			const subCategoryCondition = {
				$or: [
					{ category: subCategory },
					{ subCategory: subCategory },
					{ subSubCategory: subCategory }
				]
			}
			
			// Combine with existing conditions using $and
			if (where.$or) {
				where.$and = (where.$and || []).concat([
					{ $or: where.$or },
					subCategoryCondition
				])
				delete where.$or
			} else {
				Object.assign(where, subCategoryCondition)
			}
		} else {
			// No subcategory specified - include all products from main category AND all subcategories
			const Category = (await import('@/models/Category')).default
			// Find the main category
			const mainCategoryResult = await Category.findOne({ name: category, level: 0 }).lean()
			const mainCategory = Array.isArray(mainCategoryResult) ? null : mainCategoryResult
			
			if (mainCategory && mainCategory._id) {
				const mainCategoryId = mainCategory._id as any
				
				// Get all subcategories (level 1) of this main category
				const subCategories = await Category.find({
					parentCategory: mainCategoryId,
					level: 1,
					isActive: { $ne: false }
				}).lean()
				
				// Get all sub-subcategories (level 2) - children of the subcategories
				const subCategoryIds = subCategories.map((sc: any) => sc._id).filter(Boolean)
				const subSubCategories = subCategoryIds.length > 0 ? await Category.find({
					parentCategory: { $in: subCategoryIds },
					level: 2,
					isActive: { $ne: false }
				}).lean() : []
				
				// Collect all category names to search
				const categoryNames = [category] // Main category
				subCategories.forEach((subCat: any) => {
					if (subCat.name) categoryNames.push(subCat.name)
				})
				subSubCategories.forEach((subSubCat: any) => {
					if (subSubCat.name) categoryNames.push(subSubCat.name)
				})
				
				// Filter products that match main category OR any subcategory
				const categoryCondition = {
					$or: [
						{ category: { $in: categoryNames } },
						{ subCategory: { $in: categoryNames } },
						{ subSubCategory: { $in: categoryNames } }
					]
				}
				
				// Combine with existing conditions using $and
				if (where.$or) {
					// If there's already a $or (from search), combine with $and
					where.$and = (where.$and || []).concat([
						{ $or: where.$or },
						categoryCondition
					])
					delete where.$or
				} else {
					// No existing $or, just add category condition
					Object.assign(where, categoryCondition)
				}
			} else {
				// Fallback: if category not found in admin categories, use simple match
				where.category = category
			}
		}
	}
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

async function fetchSubCategories(mainCategoryName: string) {
	const { connectToDatabase } = await import('@/app/lib/mongodb')
	const Category = (await import('@/models/Category')).default
	const Product = (await import('@/models/Product')).default
	await connectToDatabase()
	
	// Find the main category
	const mainCategoryResult = await Category.findOne({ name: mainCategoryName, level: 0 }).lean()
	const mainCategory = Array.isArray(mainCategoryResult) ? null : mainCategoryResult
	
	if (!mainCategory || !mainCategory._id) return { subCategories: [], allCount: 0 }
	
	const mainCategoryId = mainCategory._id as any
	
	// Get all subcategories (level 1) of this main category
	const subCategories = await Category.find({
		parentCategory: mainCategoryId,
		level: 1,
		isActive: { $ne: false }
	})
		.select('name displayOrder image _id')
		.sort({ displayOrder: 1, name: 1 })
		.lean()
	
	// Get all sub-subcategories (level 2) for counting
	const subCategoryIds = subCategories.map((sc: any) => sc._id)
	const subSubCategories = subCategoryIds.length > 0 ? await Category.find({
		parentCategory: { $in: subCategoryIds },
		level: 2,
		isActive: { $ne: false }
	}).lean() : []
	
	// Get product counts for each subcategory
	// Products can have subcategory name in category, subCategory, or subSubCategory fields
	// Also include products where main category is in category field and subcategory is in subCategory field
	// Also include products from sub-subcategories of this subcategory
	const subCategoriesWithCounts = await Promise.all(
		subCategories.map(async (subCat: any) => {
			// Get sub-subcategories for this subcategory
			const subSubCatsForThis = subSubCategories.filter((ssc: any) => 
				ssc.parentCategory && String(ssc.parentCategory._id || ssc.parentCategory) === String(subCat._id)
			)
			const subSubNames = subSubCatsForThis.map((ssc: any) => ssc.name)
			
			// Count products in this subcategory
			// Check all possible combinations:
			// 1. category = subcategory name
			// 2. subCategory = subcategory name
			// 3. subSubCategory = subcategory name
			// 4. category = main category AND subCategory = subcategory name
			// 5. Products from sub-subcategories
			const count = await Product.countDocuments({
				$or: [
					{ category: subCat.name },
					{ subCategory: subCat.name },
					{ subSubCategory: subCat.name },
					// Products with main category in category field and this subcategory in subCategory field
					{
						$and: [
							{ category: mainCategoryName },
							{ subCategory: subCat.name }
						]
					},
					// Also include products from sub-subcategories
					...(subSubNames.length > 0 ? [
						{ category: { $in: subSubNames } },
						{ subCategory: { $in: subSubNames } },
						{ subSubCategory: { $in: subSubNames } },
						// Products with main category and sub-subcategory
						{
							$and: [
								{ category: mainCategoryName },
								{ subSubCategory: { $in: subSubNames } }
							]
						}
					] : [])
				]
			})
			return {
				name: String(subCat.name),
				displayOrder: Number(subCat.displayOrder || 0),
				image: subCat.image ? String(subCat.image) : '',
				count: count
			}
		})
	)
	
	// Calculate total count for "All" - includes all products from main category and all subcategories
	const allCategoryNames = [
		mainCategoryName,
		...subCategories.map((sc: any) => sc.name),
		...subSubCategories.map((ssc: any) => ssc.name)
	]
	const allCount = await Product.countDocuments({
		$or: [
			{ category: { $in: allCategoryNames } },
			{ subCategory: { $in: allCategoryNames } },
			{ subSubCategory: { $in: allCategoryNames } }
		]
	})
	
	// Show all subcategories (even with 0 products) so users can see what's available
	return { subCategories: subCategoriesWithCounts, allCount }
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
	
	// Fetch subcategories if a main category is selected
	const subCategoriesData = searchParams.category ? await fetchSubCategories(searchParams.category) : { subCategories: [], allCount: 0 }
	const subCategories = subCategoriesData.subCategories || []
	const allCategoryCount = subCategoriesData.allCount || total
	
	return (
		<div className="pb-16 md:pb-0">
			{/* Mobile Search Bar - Only visible on mobile */}
			<MobileSearchBar />
			
			<div className="container-pg py-2 sm:py-4 md:py-6">
				<div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
					<ProductFilters categories={meta.categories} brands={meta.brands} />
					<section className="lg:col-span-3">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
							<h1 className="text-lg sm:text-xl md:text-2xl font-semibold">
								{searchParams.category ? `${searchParams.category}` : 'All Products'}
							</h1>
							<div className="text-xs sm:text-sm text-slate-600">{total} results</div>
						</div>
						
						{/* Subcategories Section - Show when main category is selected */}
						{subCategories.length > 0 && (
							<div className="mt-4 sm:mt-6">
								<h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Subcategories</h2>
								<div className="flex flex-wrap gap-2 sm:gap-3">
									<Link
										href={`/products?category=${encodeURIComponent(searchParams.category || '')}`}
										className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
											!searchParams.subCategory
												? 'bg-brand-accent text-white'
												: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
										}`}
									>
										All ({allCategoryCount})
									</Link>
									{subCategories.map((subCat: any) => (
										<Link
											key={subCat.name}
											href={`/products?category=${encodeURIComponent(searchParams.category || '')}&subCategory=${encodeURIComponent(subCat.name)}`}
											className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
												searchParams.subCategory === subCat.name
													? 'bg-brand-accent text-white'
													: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
											}`}
										>
											{subCat.name} ({subCat.count})
										</Link>
									))}
								</div>
							</div>
						)}
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
