import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import Category from '@/models/Category'
import CategorySlider from '@/app/components/home/CategorySlider'
import ProductSection from '@/app/components/home/ProductSection'
import MobileSearchBar from '@/app/components/home/MobileSearchBar'
import ServiceMarquee from '@/app/components/home/ServiceMarquee'

async function fetchCategories() {
	try {
		// Connection already established at page level
		// Only fetch top-level categories (level 0 or no parentCategory)
		const dbCategories = await Category.find({
			$or: [
				{ level: 0 },
				{ level: { $exists: false } },
				{ parentCategory: { $exists: false } },
				{ parentCategory: null }
			],
			isActive: { $ne: false }
		}).lean()
		
		// Build category map with proper image handling
		const categoryMap = new Map()
		dbCategories.forEach((cat: any) => {
			if (cat.name && !Array.isArray(cat)) {
				const catNameLower = cat.name.toLowerCase().trim()
				// Preserve image if it exists, even if empty string
				const imageUrl = cat.image ? String(cat.image).trim() : ''
				categoryMap.set(catNameLower, {
					name: String(cat.name).trim(),
					image: imageUrl,
					displayOrder: Number(cat.displayOrder || 0)
				})
			}
		})
		
		// Only add product-derived categories if they don't exist in admin categories
		// Optimized: Fetch all sub-categories once instead of querying in loop
		const productCategories = await Product.distinct('category')
		if (productCategories.length > 0) {
			// Get all sub-categories in one query
			const subCategories = await Category.find({
				level: { $gt: 0 }
			}).select('name').lean()
			const subCategoryNames = new Set(
				subCategories.map((sc: any) => String(sc.name).toLowerCase().trim())
			)
			
			// Add product categories that aren't in admin categories and aren't sub-categories
		for (const catName of productCategories) {
			if (catName) {
				const catNameLower = String(catName).toLowerCase().trim()
					if (!categoryMap.has(catNameLower) && !subCategoryNames.has(catNameLower)) {
						categoryMap.set(catNameLower, {
							name: String(catName).trim(),
							image: '',
							displayOrder: 999
						})
					}
				}
			}
		}
		
		return Array.from(categoryMap.values())
			.filter((c) => c.name)
			.sort((a, b) => {
				if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder
				return a.name.localeCompare(b.name)
			})
	} catch (err) {
		console.error('Error fetching categories:', err)
		return []
	}
}

async function fetchFlashDeals() {
	try {
		// Connection already established at page level
		// Fetch products with discount badges (badges containing % OFF or similar)
		// Only select needed fields for better performance
		let items = await Product.find({
			badges: { $exists: true, $ne: [] },
			$or: [
				{ 'badges': { $regex: /% OFF/i } },
				{ 'badges': { $regex: /discount/i } },
				{ 'badges': { $regex: /sale/i } }
			]
		})
			.select('_id title slug images badges variants recentSales trendingScore totalSales createdAt')
			.sort({ recentSales: -1, trendingScore: -1, totalSales: -1, createdAt: -1 })
			.limit(20)
			.lean()
		
		// If no discount products, return empty (no fallback to avoid extra query)
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
		console.error('Error fetching flash deals:', err)
		}
		return []
	}
}

async function fetchFeaturedProducts() {
	try {
		// Connection already established at page level
		// Fetch featured products (high total sales or high view count)
		// Only select needed fields for better performance
		let items = await Product.find({
			$or: [
				{ totalSales: { $gte: 10 } },
				{ viewCount: { $gte: 50 } },
				{ badges: { $exists: true, $ne: [] } }
			]
		})
			.select('_id title slug images badges variants totalSales viewCount createdAt')
			.sort({ totalSales: -1, viewCount: -1, createdAt: -1 })
			.limit(20)
			.lean()
		
		// Single fallback: If no products meet criteria, show any products sorted by popularity
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({})
				.select('_id title slug images badges variants popularity createdAt')
				.sort({ popularity: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
		console.error('Error fetching featured products:', err)
		}
		return []
	}
}

async function fetchBestSellers() {
	try {
		// Connection already established at page level
		// Fetch best sellers (highest total sales) - only select needed fields
		let items = await Product.find({
			totalSales: { $gt: 0 }
		})
			.select('_id title slug images badges variants totalSales totalRevenue')
			.sort({ totalSales: -1, totalRevenue: -1 })
			.limit(20)
			.lean()
		
		// If no products with sales, return empty (no fallback to avoid extra query)
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
		console.error('Error fetching best sellers:', err)
		}
		return []
	}
}

async function fetchNewArrivals() {
	try {
		// Connection already established at page level
		// Fetch newest products - only select needed fields
		const items = await Product.find({})
			.select('_id title slug images badges variants createdAt')
			.sort({ createdAt: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
		console.error('Error fetching new arrivals:', err)
		}
		return []
	}
}

async function fetchTrendingProducts() {
	try {
		// Connection already established at page level
		// Fetch trending products (high recent sales velocity) - only select needed fields
		let items = await Product.find({
			recentSales: { $gt: 0 },
			lastSoldAt: { $exists: true, $ne: null }
		})
			.select('_id title slug images badges variants trendingScore recentSales lastSoldAt')
			.sort({ trendingScore: -1, recentSales: -1, lastSoldAt: -1 })
			.limit(20)
			.lean()
		
		// Single fallback: If no trending products, show recently updated products
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({})
				.select('_id title slug images badges variants updatedAt createdAt')
				.sort({ updatedAt: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
		console.error('Error fetching trending products:', err)
		}
		return []
	}
}

async function fetchSpecialOffers() {
	try {
		// Connection already established at page level
		// Fetch products with special offers (badges/discounts) - only select needed fields
		let items = await Product.find({
			badges: { $exists: true, $ne: [] }
		})
			.select('_id title slug images badges variants recentSales totalSales createdAt')
			.sort({ recentSales: -1, totalSales: -1, createdAt: -1 })
			.limit(20)
			.lean()
		
		// If no products with badges, return empty (no fallback to avoid extra query)
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
			console.error('Error fetching special offers:', err)
		}
		return []
	}
}

async function fetchHotProducts() {
	try {
		// Connection already established at page level
		// Fetch hot products (high recent sales velocity + high view count) - only select needed fields
		let items = await Product.find({
			$and: [
				{ recentSales: { $gt: 5 } },
				{ viewCount: { $gt: 20 } }
			]
		})
			.select('_id title slug images badges variants trendingScore recentSales viewCount')
			.sort({ trendingScore: -1, recentSales: -1, viewCount: -1 })
			.limit(20)
			.lean()
		
		// Single fallback: If no hot products, show recently updated products
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({})
				.select('_id title slug images badges variants updatedAt createdAt')
				.sort({ updatedAt: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
			console.error('Error fetching hot products:', err)
		}
		return []
	}
}

async function fetchMostSelling() {
	try {
		// Connection already established at page level
		// Fetch most selling products (highest total sales quantity) - only select needed fields
		let items = await Product.find({
			totalSales: { $gt: 0 }
			})
			.select('_id title slug images badges variants totalSales totalRevenue recentSales')
			.sort({ totalSales: -1, totalRevenue: -1, recentSales: -1 })
			.limit(20)
			.lean()
		
		// Single fallback: If no products with sales, show any products sorted by popularity
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({})
				.select('_id title slug images badges variants popularity createdAt')
				.sort({ popularity: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
			console.error('Error fetching most selling products:', err)
		}
		return []
	}
}

const categoryImages: Record<string, string> = {
	'breakfast essentials': '/categories/breakfast.jpg',
	'milk & dairy': '/categories/dairy.jpg',
	'fruits & vegetables': '/categories/fruits-veg.jpg',
	'meat & seafood': '/categories/meat.jpg',
	'daal, rice, atta & cheeni': '/categories/rice.jpg',
	'edible oils & ghee': '/categories/oil-ghee.jpg',
	'spices': '/categories/spices.jpg',
	'dry fruits': '/categories/dry-fruits.jpg',
	'pulses': '/categories/pulses.jpg',
	'flour': '/categories/flour.jpg',
	'grains': '/categories/grains.jpg',
	'oils': '/categories/oil-ghee.jpg',
	'rice': '/categories/rice.jpg',
}

// Enable ISR (Incremental Static Regeneration) for better performance
// Revalidate every 60 seconds - page will be cached and only regenerated when needed
export const revalidate = 60

export default async function HomePage() {
	// Connect to database once at the top level (connection is cached globally)
	await connectToDatabase()
	
	// Fetch all data in parallel
	const [categories, flashDeals, featuredProducts, bestSellers, newArrivals, trendingProducts, specialOffers, hotProducts, mostSelling] = await Promise.all([
		fetchCategories(),
		fetchFlashDeals(),
		fetchFeaturedProducts(),
		fetchBestSellers(),
		fetchNewArrivals(),
		fetchTrendingProducts(),
		fetchSpecialOffers(),
		fetchHotProducts(),
		fetchMostSelling()
	])
	
	// Ensure products don't appear in multiple sections
	// Priority: Flash Deals > Hot Products > Trending > Most Selling > Best Sellers > Featured > Special Offers > New Arrivals
	const usedProductIds = new Set<string>()
	
	const deduplicatedFlashDeals = flashDeals.filter(p => {
		const id = String(p._id || p.id)
		if (usedProductIds.has(id)) return false
		usedProductIds.add(id)
		return true
	})
	
	const deduplicatedHotProducts = hotProducts.filter(p => {
		const id = String(p._id || p.id)
		if (usedProductIds.has(id)) return false
		usedProductIds.add(id)
		return true
	})
	
	const deduplicatedTrending = trendingProducts.filter(p => {
		const id = String(p._id || p.id)
		if (usedProductIds.has(id)) return false
		usedProductIds.add(id)
		return true
	})
	
	const deduplicatedMostSelling = mostSelling.filter(p => {
		const id = String(p._id || p.id)
		if (usedProductIds.has(id)) return false
		usedProductIds.add(id)
		return true
	})
	
	const deduplicatedBestSellers = bestSellers.filter(p => {
		const id = String(p._id || p.id)
		if (usedProductIds.has(id)) return false
		usedProductIds.add(id)
		return true
	})
	
	const deduplicatedFeatured = featuredProducts.filter(p => {
		const id = String(p._id || p.id)
		if (usedProductIds.has(id)) return false
		usedProductIds.add(id)
		return true
	})
	
	const deduplicatedSpecialOffers = specialOffers.filter(p => {
		const id = String(p._id || p.id)
		if (usedProductIds.has(id)) return false
		usedProductIds.add(id)
		return true
	})
	
	const deduplicatedNewArrivals = newArrivals.filter(p => {
		const id = String(p._id || p.id)
		if (usedProductIds.has(id)) return false
		usedProductIds.add(id)
		return true
	})
	
	return (
		<main className="bg-white pb-16 md:pb-0">
			{/* Mobile Search Bar - Only visible on mobile */}
			<MobileSearchBar />
			
			{/* Service Marquee - Mobile only, centered below search bar */}
			<div className="md:hidden">
				<ServiceMarquee />
			</div>
			
			{/* Categories Section - Horizontal Scrollable */}
			<section className="container-pg py-3 sm:py-4 md:py-6">
				<CategorySlider categories={categories} categoryImages={categoryImages} />
			</section>

			{/* Flash Deals Section */}
			{deduplicatedFlashDeals.length > 0 && (
				<ProductSection 
					title="Flash Deals" 
					products={deduplicatedFlashDeals} 
					sliderId="flash-deals-slider" 
					icon="flash"
				/>
			)}

			{/* Hot Products Section */}
			{deduplicatedHotProducts.length > 0 && (
				<ProductSection 
					title="Hot Products" 
					products={deduplicatedHotProducts} 
					sliderId="hot-products-slider"
					icon="hot"
				/>
			)}

			{/* Trending Products Section */}
			{deduplicatedTrending.length > 0 && (
				<ProductSection 
					title="Trending Now" 
					products={deduplicatedTrending} 
					sliderId="trending-products-slider" 
					icon="trending"
				/>
			)}

			{/* Most Selling Section */}
			{deduplicatedMostSelling.length > 0 && (
				<ProductSection 
					title="Most Selling" 
					products={deduplicatedMostSelling} 
					sliderId="most-selling-slider"
					icon="bestseller"
				/>
			)}

			{/* Best Sellers Section */}
			{deduplicatedBestSellers.length > 0 && (
				<ProductSection 
					title="Best Sellers" 
					products={deduplicatedBestSellers} 
					sliderId="best-sellers-slider" 
					icon="bestseller"
				/>
			)}

			{/* Featured Products Section */}
			{deduplicatedFeatured.length > 0 && (
				<ProductSection 
					title="Featured Products" 
					products={deduplicatedFeatured} 
					sliderId="featured-products-slider" 
					icon="featured"
				/>
			)}

			{/* Special Offers Section */}
			{deduplicatedSpecialOffers.length > 0 && (
				<ProductSection 
					title="Special Offers" 
					products={deduplicatedSpecialOffers} 
					sliderId="special-offers-slider" 
					icon="special"
				/>
			)}

			{/* New Arrivals Section */}
			{deduplicatedNewArrivals.length > 0 && (
				<ProductSection 
					title="New Arrivals" 
					products={deduplicatedNewArrivals} 
					sliderId="new-arrivals-slider" 
					icon="new"
				/>
			)}
		</main>
	)
}
