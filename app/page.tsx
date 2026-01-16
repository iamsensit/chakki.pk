import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import Category from '@/models/Category'
import CategorySlider from '@/app/components/home/CategorySlider'
import ProductSection from '@/app/components/home/ProductSection'
import MobileSearchBar from '@/app/components/home/MobileSearchBar'
import ServiceMarquee from '@/app/components/home/ServiceMarquee'

async function fetchCategories() {
	try {
		await connectToDatabase()
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
		// and only if they're top-level (not sub-categories from products)
		const productCategories = await Product.distinct('category')
		for (const catName of productCategories) {
			if (catName) {
				const catNameLower = String(catName).toLowerCase().trim()
				if (!categoryMap.has(catNameLower)) {
					// Only add if it's not a sub-category (check if it exists as a sub-category in DB)
					const existsAsSub = await Category.findOne({
						name: { $regex: new RegExp(`^${String(catName).trim()}$`, 'i') },
						level: { $gt: 0 }
					}).lean()
					
					if (!existsAsSub) {
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
		await connectToDatabase()
		// Fetch products with discount badges (badges containing % OFF or similar)
		let items = await Product.find({
			badges: { $exists: true, $ne: [] },
			$or: [
				{ 'badges': { $regex: /% OFF/i } },
				{ 'badges': { $regex: /discount/i } },
				{ 'badges': { $regex: /sale/i } }
			]
		})
			.sort({ recentSales: -1, trendingScore: -1, totalSales: -1, createdAt: -1 })
			.limit(20)
			.lean()
		
		// Fallback: If no products with discount badges, show products with any badges
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({
				badges: { $exists: true, $ne: [] }
			})
				.sort({ createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching flash deals:', err)
		return []
	}
}

async function fetchFeaturedProducts() {
	try {
		await connectToDatabase()
		// Fetch featured products (high total sales or high view count)
		let items = await Product.find({
			$or: [
				{ totalSales: { $gte: 10 } },
				{ viewCount: { $gte: 50 } },
				{ badges: { $exists: true, $ne: [] } }
			]
		})
			.sort({ totalSales: -1, viewCount: -1, createdAt: -1 })
			.limit(20)
			.lean()
		
		// Fallback: If no products meet criteria, show products with any sales or views
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({
				$or: [
					{ totalSales: { $gt: 0 } },
					{ viewCount: { $gt: 0 } }
				]
			})
				.sort({ totalSales: -1, viewCount: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		// Final fallback: Show any products sorted by popularity or creation date
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({})
				.sort({ popularity: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching featured products:', err)
		return []
	}
}

async function fetchBestSellers() {
	try {
		await connectToDatabase()
		// Fetch best sellers (highest total sales)
		let items = await Product.find({
			totalSales: { $gt: 0 }
		})
			.sort({ totalSales: -1, totalRevenue: -1 })
			.limit(20)
			.lean()
		
		// Fallback: If no products have sales yet, show products sorted by popularity
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({})
				.sort({ popularity: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching best sellers:', err)
		return []
	}
}

async function fetchNewArrivals() {
	try {
		await connectToDatabase()
		// Fetch newest products
		const items = await Product.find({})
			.sort({ createdAt: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching new arrivals:', err)
		return []
	}
}

async function fetchTrendingProducts() {
	try {
		await connectToDatabase()
		// Fetch trending products (high recent sales velocity)
		let items = await Product.find({
			recentSales: { $gt: 0 },
			lastSoldAt: { $exists: true, $ne: null }
		})
			.sort({ trendingScore: -1, recentSales: -1, lastSoldAt: -1 })
			.limit(20)
			.lean()
		
		// Fallback: If no products have recent sales, show products with any sales
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({
				totalSales: { $gt: 0 }
			})
				.sort({ totalSales: -1, updatedAt: -1 })
				.limit(20)
				.lean()
		}
		
		// Final fallback: Show recently updated products
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({})
				.sort({ updatedAt: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching trending products:', err)
		return []
	}
}

async function fetchSpecialOffers() {
	try {
		await connectToDatabase()
		// Fetch products with special offers (badges/discounts) - prioritize by sales
		let items = await Product.find({
			badges: { $exists: true, $ne: [] }
		})
			.sort({ recentSales: -1, totalSales: -1, createdAt: -1 })
			.limit(20)
			.lean()
		
		// Fallback: If no products with badges, show products with high popularity
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({
				popularity: { $gt: 0 }
			})
				.sort({ popularity: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching special offers:', err)
		return []
	}
}

async function fetchHotProducts() {
	try {
		await connectToDatabase()
		// Fetch hot products (high recent sales velocity + high view count)
		let items = await Product.find({
			$and: [
				{ recentSales: { $gt: 5 } },
				{ viewCount: { $gt: 20 } }
			]
		})
			.sort({ trendingScore: -1, recentSales: -1, viewCount: -1 })
			.limit(20)
			.lean()
		
		// Fallback: Products with high trending score
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({
				trendingScore: { $gt: 0 }
			})
				.sort({ trendingScore: -1, recentSales: -1 })
				.limit(20)
				.lean()
		}
		
		// Final fallback: Products with any recent activity
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({
				$or: [
					{ recentSales: { $gt: 0 } },
					{ viewCount: { $gt: 0 } }
				]
			})
				.sort({ updatedAt: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching hot products:', err)
		return []
	}
}

async function fetchMostSelling() {
	try {
		await connectToDatabase()
		// Fetch most selling products (highest total sales quantity)
		let items = await Product.find({
			totalSales: { $gt: 0 }
		})
			.sort({ totalSales: -1, totalRevenue: -1, recentSales: -1 })
			.limit(20)
			.lean()
		
		// Fallback: Products sorted by revenue
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({
				totalRevenue: { $gt: 0 }
			})
				.sort({ totalRevenue: -1, popularity: -1 })
				.limit(20)
				.lean()
		}
		
		// Final fallback: Any products sorted by popularity
		if (!Array.isArray(items) || items.length === 0) {
			items = await Product.find({})
				.sort({ popularity: -1, createdAt: -1 })
				.limit(20)
				.lean()
		}
		
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching most selling products:', err)
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

// Make this page dynamic to avoid MongoDB connection errors during build
export const dynamic = 'force-dynamic'

export default async function HomePage() {
	const categories = await fetchCategories()
	
	// Fetch all product lists
	const [flashDeals, featuredProducts, bestSellers, newArrivals, trendingProducts, specialOffers, hotProducts, mostSelling] = await Promise.all([
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
