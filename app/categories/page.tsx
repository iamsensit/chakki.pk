import Link from 'next/link'
import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import Category from '@/models/Category'

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
					displayOrder: Number(cat.displayOrder || 0),
					description: cat.description ? String(cat.description) : ''
				})
			}
		})
		
		for (const catName of productCategories) {
			if (catName && !categoryMap.has(String(catName).toLowerCase())) {
				categoryMap.set(String(catName).toLowerCase(), {
					name: String(catName),
					image: '',
					displayOrder: 999,
					description: ''
				})
			}
		}
		
		// Get product counts for each category
		const categoriesWithCounts = await Promise.all(
			Array.from(categoryMap.values()).map(async (cat) => {
				const count = await Product.countDocuments({ category: cat.name })
				return { ...cat, count }
			})
		)
		
		return categoriesWithCounts
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

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
	const categories = await fetchCategories()
	
	return (
		<main className="bg-white min-h-screen">
			<div className="container-pg py-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">All Categories</h1>
				<p className="text-slate-600 mb-8">Browse our wide selection of products by category</p>
				
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
					{categories.map((cat: any) => {
						const catNameLower = cat.name.toLowerCase()
						const imageUrl = cat.image || categoryImages[catNameLower] || '/categories/default.jpg'
						
						return (
							<Link
								key={cat.name}
								href={`/products?category=${encodeURIComponent(cat.name)}`}
								className="group rounded-lg border border-gray-200 overflow-hidden hover:border-brand-accent hover:shadow-lg transition-all bg-white"
							>
								<div className="relative h-32 sm:h-40 md:h-48 bg-gray-100 overflow-hidden">
									{imageUrl && imageUrl !== '/categories/default.jpg' ? (
										<img
											src={imageUrl}
											alt={cat.name}
											className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
										/>
									) : (
										<div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
											<div className="text-center">
												<div className="text-2xl mb-2">📦</div>
												<div className="text-xs">No image</div>
											</div>
										</div>
									)}
								</div>
								<div className="p-3 sm:p-4 text-center">
									<h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 group-hover:text-brand-accent transition-colors">
										{cat.name}
									</h3>
									{cat.description && (
										<p className="text-xs text-slate-600 mb-2 line-clamp-2">{cat.description}</p>
									)}
									{cat.count !== undefined && (
										<p className="text-xs text-slate-500">
											{cat.count} {cat.count === 1 ? 'product' : 'products'}
										</p>
									)}
								</div>
							</Link>
						)
					})}
				</div>
				
				{categories.length === 0 && (
					<div className="text-center py-12">
						<p className="text-slate-600">No categories available at the moment.</p>
						<Link href="/" className="mt-4 inline-block text-brand-accent hover:underline">
							Return to homepage
						</Link>
					</div>
				)}
			</div>
		</main>
	)
}

