import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import Category from '@/models/Category'
import CategorySlider from '@/app/components/home/CategorySlider'
import ProductSection from '@/app/components/home/ProductSection'

async function fetchCategories() {
	try {
		await connectToDatabase()
		const dbCategories = await Category.find({}).lean()
		const productCategories = await Product.distinct('category')
		
		const categoryMap = new Map()
		dbCategories.forEach((cat: any) => {
			if (cat.name && !Array.isArray(cat)) {
				categoryMap.set(cat.name.toLowerCase(), {
					name: String(cat.name),
					image: cat.image ? String(cat.image) : '',
					displayOrder: Number(cat.displayOrder || 0)
				})
			}
		})
		
		for (const catName of productCategories) {
			if (catName && !categoryMap.has(String(catName).toLowerCase())) {
				categoryMap.set(String(catName).toLowerCase(), {
					name: String(catName),
					image: '',
					displayOrder: 999
				})
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
		// Fetch products with discounts or best sellers
		const items = await Product.find({})
			.sort({ popularity: -1, createdAt: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching flash deals:', err)
		return []
	}
}

async function fetchFeaturedProducts() {
	try {
		await connectToDatabase()
		// Fetch featured products (products with badges or high popularity)
		const items = await Product.find({
			$or: [
				{ badges: { $exists: true, $ne: [] } },
				{ popularity: { $gte: 50 } }
			]
		})
			.sort({ popularity: -1, createdAt: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching featured products:', err)
		return []
	}
}

async function fetchBestSellers() {
	try {
		await connectToDatabase()
		// Fetch best sellers (high popularity products)
		const items = await Product.find({})
			.sort({ popularity: -1 })
			.limit(20)
			.lean()
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
		// Fetch trending products (recently popular)
		const items = await Product.find({})
			.sort({ popularity: -1, updatedAt: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching trending products:', err)
		return []
	}
}

async function fetchSpecialOffers() {
	try {
		await connectToDatabase()
		// Fetch products with special offers (badges/discounts)
		const items = await Product.find({
			badges: { $exists: true, $ne: [] }
		})
			.sort({ createdAt: -1 })
			.limit(20)
			.lean()
		return Array.isArray(items) ? items : []
	} catch (err) {
		console.error('Error fetching special offers:', err)
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
	const flashDeals = await fetchFlashDeals()
	const featuredProducts = await fetchFeaturedProducts()
	const bestSellers = await fetchBestSellers()
	const newArrivals = await fetchNewArrivals()
	const trendingProducts = await fetchTrendingProducts()
	const specialOffers = await fetchSpecialOffers()
	
	return (
		<main className="bg-white">
			{/* Categories Section - Horizontal Scrollable */}
			<section className="container-pg py-6">
				<CategorySlider categories={categories} categoryImages={categoryImages} />
			</section>

			{/* Flash Deals Section */}
			{flashDeals.length > 0 && (
				<ProductSection 
					title="Flash Deals" 
					products={flashDeals} 
					sliderId="flash-deals-slider" 
				/>
			)}

			{/* Featured Products Section */}
			{featuredProducts.length > 0 && (
				<ProductSection 
					title="Featured Products" 
					products={featuredProducts} 
					sliderId="featured-products-slider" 
				/>
			)}

			{/* Best Sellers Section */}
			{bestSellers.length > 0 && (
				<ProductSection 
					title="Best Sellers" 
					products={bestSellers} 
					sliderId="best-sellers-slider" 
				/>
			)}

			{/* New Arrivals Section */}
			{newArrivals.length > 0 && (
				<ProductSection 
					title="New Arrivals" 
					products={newArrivals} 
					sliderId="new-arrivals-slider" 
				/>
			)}

			{/* Trending Products Section */}
			{trendingProducts.length > 0 && (
				<ProductSection 
					title="Trending Now" 
					products={trendingProducts} 
					sliderId="trending-products-slider" 
				/>
			)}

			{/* Special Offers Section */}
			{specialOffers.length > 0 && (
				<ProductSection 
					title="Special Offers" 
					products={specialOffers} 
					sliderId="special-offers-slider" 
				/>
			)}
		</main>
	)
}
