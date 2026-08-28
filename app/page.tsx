import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import Category from '@/models/Category'
import HeroSection from '@/components/home/HeroSection'
import CategoryGrid from '@/components/home/CategoryGrid'
import ProductSection from '@/components/home/ProductSection'
import MobileSearchBar from '@/app/components/home/MobileSearchBar'
import ServiceMarquee from '@/app/components/home/ServiceMarquee'

// Ensure real-time rendering when new products or categories are added
export const dynamic = 'force-dynamic'
export const revalidate = 0

function toPlainObject<T>(data: T): T {
	return JSON.parse(JSON.stringify(data))
}

async function fetchCategories() {
	try {
		await connectToDatabase()
		
		// 1. Fetch all active top-level admin categories
		const dbCategories = await Category.find({
			$or: [
				{ level: 0 },
				{ level: { $exists: false } },
				{ parentCategory: { $exists: false } },
				{ parentCategory: null }
			],
			isActive: { $ne: false }
		}).sort({ displayOrder: 1, name: 1 }).lean()
		
		// 2. Fetch distinct product categories to include any product-assigned categories
		const productCategories = await Product.distinct('category', { category: { $exists: true, $nin: [null, ''] } })
		
		const categoryMap = new Map<string, { name: string; slug: string; image: string; displayOrder: number; productCount: number }>()

		// Add admin categories
		for (const cat of dbCategories) {
			if (cat.name) {
				const nameStr = String(cat.name).trim()
				const slugStr = cat.slug ? String(cat.slug).trim() : nameStr.toLowerCase().replace(/\s+/g, '-')
				const key = nameStr.toLowerCase()
				categoryMap.set(key, {
					name: nameStr,
					slug: slugStr,
					image: cat.image ? String(cat.image).trim() : '',
					displayOrder: Number(cat.displayOrder ?? 1000),
					productCount: 0,
				})
			}
		}

		// Add product-derived categories if not present
		for (const catName of productCategories) {
			if (catName && typeof catName === 'string') {
				const nameStr = catName.trim()
				const key = nameStr.toLowerCase()
				if (!categoryMap.has(key)) {
					categoryMap.set(key, {
						name: nameStr,
						slug: nameStr.toLowerCase().replace(/\s+/g, '-'),
						image: '',
						displayOrder: 2000,
						productCount: 0,
					})
				}
			}
		}

		// Count real products for each category in real-time
		const categoriesArray = Array.from(categoryMap.values())
		const categoriesWithCounts = await Promise.all(
			categoriesArray.map(async (cat) => {
				const count = await Product.countDocuments({
					$or: [
						{ category: cat.name },
						{ subCategory: cat.name },
						{ subSubCategory: cat.name },
						{ category: { $regex: new RegExp(`^${cat.name}$`, 'i') } }
					]
				})
				return {
					...cat,
					productCount: count
				}
			})
		)

		const sorted = categoriesWithCounts.sort((a, b) => {
			if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder
			return a.name.localeCompare(b.name)
		})

		return toPlainObject(sorted)
	} catch (err) {
		console.error('Error fetching categories in HomePage:', err)
		return []
	}
}

async function fetchFlashDeals() {
	try {
		await connectToDatabase()
		const items = await Product.find({
			badges: { $exists: true, $ne: [] },
			$or: [
				{ badges: { $regex: /% OFF/i } },
				{ badges: { $regex: /discount/i } },
				{ badges: { $regex: /sale/i } },
				{ badges: { $regex: /deal/i } }
			]
		})
			.select('_id title slug images badges variants recentSales trendingScore totalSales createdAt')
			.sort({ createdAt: -1 })
			.limit(20)
			.lean()

		return Array.isArray(items) ? toPlainObject(items) : []
	} catch (err) {
		console.error('Error fetching flash deals:', err)
		return []
	}
}

async function fetchNewArrivals() {
	try {
		await connectToDatabase()
		const items = await Product.find({})
			.select('_id title slug images badges variants createdAt category subCategory brand')
			.sort({ createdAt: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? toPlainObject(items) : []
	} catch (err) {
		console.error('Error fetching new arrivals:', err)
		return []
	}
}

async function fetchFeaturedProducts() {
	try {
		await connectToDatabase()
		const items = await Product.find({
			$or: [
				{ badges: { $regex: /featured/i } },
				{ badges: { $regex: /organic/i } },
				{ badges: { $regex: /pure/i } },
				{ viewCount: { $gte: 5 } }
			]
		})
			.select('_id title slug images badges variants totalSales viewCount createdAt')
			.sort({ viewCount: -1, createdAt: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? toPlainObject(items) : []
	} catch (err) {
		console.error('Error fetching featured products:', err)
		return []
	}
}

async function fetchTrendingProducts() {
	try {
		await connectToDatabase()
		const items = await Product.find({
			$or: [
				{ trendingScore: { $gt: 0 } },
				{ recentSales: { $gt: 0 } },
				{ viewCount: { $gt: 10 } }
			]
		})
			.select('_id title slug images badges variants trendingScore recentSales viewCount')
			.sort({ trendingScore: -1, recentSales: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? toPlainObject(items) : []
	} catch (err) {
		console.error('Error fetching trending products:', err)
		return []
	}
}

async function fetchBestSellers() {
	try {
		await connectToDatabase()
		const items = await Product.find({
			totalSales: { $gt: 0 }
		})
			.select('_id title slug images badges variants totalSales totalRevenue')
			.sort({ totalSales: -1, totalRevenue: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? toPlainObject(items) : []
	} catch (err) {
		console.error('Error fetching best sellers:', err)
		return []
	}
}

// Fetch dynamic category product rows for every category that has products
async function fetchCategoryProductSections(categories: { name: string; productCount: number }[]) {
	try {
		await connectToDatabase()
		const activeCatsWithProducts = categories.filter(c => c.productCount > 0)
		
		const sections = await Promise.all(
			activeCatsWithProducts.map(async (cat) => {
				const products = await Product.find({
					$or: [
						{ category: cat.name },
						{ subCategory: cat.name },
						{ subSubCategory: cat.name },
						{ category: { $regex: new RegExp(`^${cat.name}$`, 'i') } }
					]
				})
					.select('_id title slug images badges variants createdAt totalSales')
					.sort({ createdAt: -1 })
					.limit(15)
					.lean()

				return {
					categoryName: cat.name,
					products: Array.isArray(products) ? toPlainObject(products) : []
				}
			})
		)

		return sections.filter(s => s.products.length > 0)
	} catch (err) {
		console.error('Error fetching category product sections:', err)
		return []
	}
}

export default async function HomePage() {
	await connectToDatabase()

	const categories = await fetchCategories()

	// Fetch specific dynamic sections concurrently
	const [flashDeals, newArrivals, featuredProducts, trendingProducts, bestSellers, categorySections] = await Promise.all([
		fetchFlashDeals(),
		fetchNewArrivals(),
		fetchFeaturedProducts(),
		fetchTrendingProducts(),
		fetchBestSellers(),
		fetchCategoryProductSections(categories)
	])

	return (
		<main className="bg-white pb-16 md:pb-0">
			{/* Mobile Search Bar - Only visible on mobile */}
			<MobileSearchBar />
			
			{/* Service Marquee - Mobile only */}
			<div className="md:hidden">
				<ServiceMarquee />
			</div>

			{/* Hero Section with Left Vertical Category Sidebar & Large Cream Hero Card */}
			<HeroSection categories={categories} />

			{/* 6-Column Pastel Category Grid */}
			<CategoryGrid categories={categories} />

			{/* Flash Deals - Shows whenever products have discount/sale badges */}
			{flashDeals.length > 0 && (
				<ProductSection 
					title="Flash Deals" 
					products={flashDeals} 
					sliderId="flash-deals-slider" 
					icon="flash"
				/>
			)}

			{/* New Arrivals - Real-time freshly added products */}
			{newArrivals.length > 0 && (
				<ProductSection 
					title="New Arrivals" 
					products={newArrivals} 
					sliderId="new-arrivals-slider" 
					icon="new"
				/>
			)}

			{/* Featured Products - Only if featured items exist */}
			{featuredProducts.length > 0 && (
				<ProductSection 
					title="Featured Products" 
					products={featuredProducts} 
					sliderId="featured-products-slider" 
					icon="featured"
				/>
			)}

			{/* Trending Products - Only if trending items exist */}
			{trendingProducts.length > 0 && (
				<ProductSection 
					title="Trending Now" 
					products={trendingProducts} 
					sliderId="trending-products-slider" 
					icon="trending"
				/>
			)}

			{/* Best Sellers - Only if products with sales exist */}
			{bestSellers.length > 0 && (
				<ProductSection 
					title="Best Sellers" 
					products={bestSellers} 
					sliderId="best-sellers-slider" 
					icon="bestseller"
				/>
			)}

			{/* Automatic Category Product Sections - Auto-generated for any category containing products */}
			{categorySections.map((sec) => (
				<ProductSection
					key={sec.categoryName}
					title={sec.categoryName}
					products={sec.products}
					sliderId={`cat-${sec.categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
					icon="special"
				/>
			))}
		</main>
	)
}
