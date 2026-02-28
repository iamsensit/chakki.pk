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

// Helper function to get random products with different patterns
async function getRandomProducts(limit: number = 20, seed: number = 0) {
	try {
		// Get total count
		const total = await Product.countDocuments({})
		if (total === 0) return []
		
		// Use seed to create different random patterns for each section
		// Skip a different number of documents based on seed
		const skip = (seed * 7) % Math.max(1, total)
		
		// Fetch random products using skip and limit
		const items = await Product.find({})
			.select('_id title slug images badges variants totalSales viewCount recentSales createdAt updatedAt')
			.skip(skip)
			.limit(limit * 2) // Get more than needed
			.lean()
		
		// Shuffle using seed for consistent randomness per section
		const shuffled = Array.isArray(items) ? [...items] : []
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = (seed + i * 3) % (i + 1)
			;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
		}
		
		return shuffled.slice(0, limit)
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
			console.error('Error fetching random products:', err)
		}
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
		
		// Fallback to random products if no discount products
		if (!Array.isArray(items) || items.length === 0) {
			items = await getRandomProducts(20, 1) // Seed 1 for Flash Deals
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
		console.error('Error fetching flash deals:', err)
		}
		// Fallback to random products on error
		return await getRandomProducts(20, 1)
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
		
		// Fallback to random products if no products meet criteria
		if (!Array.isArray(items) || items.length === 0) {
			items = await getRandomProducts(20, 0) // Seed 0 for Featured Products
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
		console.error('Error fetching featured products:', err)
		}
		// Fallback to random products on error
		return await getRandomProducts(20, 0)
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
		
		// Fallback to random products if no products with sales
		if (!Array.isArray(items) || items.length === 0) {
			items = await getRandomProducts(20, 2) // Seed 2 for Best Sellers
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
		console.error('Error fetching best sellers:', err)
		}
		// Fallback to random products on error
		return await getRandomProducts(20, 2)
	}
}

async function fetchNewArrivals() {
	try {
		// Connection already established at page level
		// Fetch newest products - only select needed fields
		let items = await Product.find({})
			.select('_id title slug images badges variants createdAt')
			.sort({ createdAt: -1 })
			.limit(20)
			.lean()
		if (!Array.isArray(items) || items.length === 0) {
			items = await getRandomProducts(20, 5)
		}
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
			console.error('Error fetching new arrivals:', err)
		}
		return await getRandomProducts(20, 5)
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
		
		// Fallback to random products if no trending products
		if (!Array.isArray(items) || items.length === 0) {
			items = await getRandomProducts(20, 3) // Seed 3 for Trending Products
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
		console.error('Error fetching trending products:', err)
		}
		// Fallback to random products on error
		return await getRandomProducts(20, 3)
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
		
		// Fallback to any products if none have badges
		if (!Array.isArray(items) || items.length === 0) {
			items = await getRandomProducts(20, 6)
		}
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
			console.error('Error fetching special offers:', err)
		}
		return await getRandomProducts(20, 6)
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
		
		// Fallback to random products if no hot products
		if (!Array.isArray(items) || items.length === 0) {
			items = await getRandomProducts(20, 4) // Seed 4 for Hot Products
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
			console.error('Error fetching hot products:', err)
		}
		// Fallback to random products on error
		return await getRandomProducts(20, 4)
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
		
		// Fallback: If no products with sales, show any products sorted by popularity or random
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({})
				.select('_id title slug images badges variants popularity createdAt')
				.sort({ popularity: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		if (!Array.isArray(items) || items.length === 0) {
			items = await getRandomProducts(20, 7)
		}
		return Array.isArray(items) ? items : []
	} catch (err) {
		if (process.env.NODE_ENV !== 'production') {
			console.error('Error fetching most selling products:', err)
		}
		return await getRandomProducts(20, 7)
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

async function fetchAllProducts() {
	try {
		const items = await Product.find({})
			.select('_id title slug images badges variants totalSales viewCount recentSales createdAt')
			.sort({ createdAt: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? items : []
	} catch {
		return []
	}
}

export default async function HomePage() {
	// Connect to database once at the top level (connection is cached globally)
	await connectToDatabase()
	
	// Fetch all data in parallel
	let [categories, flashDeals, featuredProducts, bestSellers, newArrivals, trendingProducts, specialOffers, hotProducts, mostSelling] = await Promise.all([
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
	
	// Ensure every section has products - use all products as fallback for any empty section
	const allProducts = await fetchAllProducts()
	const fillProducts = allProducts.length > 0 ? allProducts : await getRandomProducts(20, 99)
	if (fillProducts.length > 0) {
		if (!flashDeals.length) flashDeals = fillProducts
		if (!featuredProducts.length) featuredProducts = fillProducts
		if (!bestSellers.length) bestSellers = fillProducts
		if (!newArrivals.length) newArrivals = fillProducts
		if (!trendingProducts.length) trendingProducts = fillProducts
		if (!specialOffers.length) specialOffers = fillProducts
		if (!hotProducts.length) hotProducts = fillProducts
		if (!mostSelling.length) mostSelling = fillProducts
	}
	
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

			{/* Flash Deals */}
			{flashDeals.length > 0 && (
				<ProductSection 
					title="Flash Deals" 
					products={flashDeals} 
					sliderId="flash-deals-slider" 
					icon="flash"
				/>
			)}

			{/* Hot Products */}
			{hotProducts.length > 0 && (
				<ProductSection 
					title="Hot Products" 
					products={hotProducts} 
					sliderId="hot-products-slider"
					icon="hot"
				/>
			)}

			{/* Featured Products */}
			{featuredProducts.length > 0 && (
				<ProductSection 
					title="Featured Products" 
					products={featuredProducts} 
					sliderId="featured-products-slider" 
					icon="featured"
				/>
			)}

			{/* Trending Products */}
			{trendingProducts.length > 0 && (
				<ProductSection 
					title="Trending Now" 
					products={trendingProducts} 
					sliderId="trending-products-slider" 
					icon="trending"
				/>
			)}

			{/* New Arrivals */}
			{newArrivals.length > 0 && (
				<ProductSection 
					title="New Arrivals" 
					products={newArrivals} 
					sliderId="new-arrivals-slider" 
					icon="new"
				/>
			)}

			{/* Best Sellers */}
			{bestSellers.length > 0 && (
				<ProductSection 
					title="Best Sellers" 
					products={bestSellers} 
					sliderId="best-sellers-slider" 
					icon="bestseller"
				/>
			)}

			{/* Most Selling */}
			{mostSelling.length > 0 && (
				<ProductSection 
					title="Most Selling" 
					products={mostSelling} 
					sliderId="most-selling-slider" 
					icon="bestseller"
				/>
			)}

			{/* Special Offers */}
			{specialOffers.length > 0 && (
				<ProductSection 
					title="Special Offers" 
					products={specialOffers} 
					sliderId="special-offers-slider" 
					icon="special"
				/>
			)}
		</main>
	)
}
