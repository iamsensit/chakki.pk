import Link from 'next/link'
import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import Category from '@/models/Category'
import { ChevronRight, Package } from 'lucide-react'
import Image from 'next/image'

async function fetchCategories() {
	try {
		await connectToDatabase()
		
		// Fetch hierarchical categories
		const dbCategories = await Category.find({ isActive: { $ne: false } })
			.populate('parentCategory', 'name _id')
			.lean()
		
		// Build hierarchical structure
		const mainCategories = dbCategories.filter((dc: any) => !dc.parentCategory || !dc.parentCategory._id)
		
		const hierarchicalData = await Promise.all(
			mainCategories.map(async (mainCat: any) => {
				if (!mainCat.name || Array.isArray(mainCat)) return null
				
				// Count products in main category and all its subcategories
				const subCats = dbCategories.filter((sc: any) => 
					sc.parentCategory && String(sc.parentCategory._id) === String(mainCat._id) && sc.level === 1
				)
				
				const subCategoryIds = subCats.map((sc: any) => sc._id)
				const subSubCats = dbCategories.filter((ssc: any) =>
					ssc.parentCategory && subCategoryIds.includes(ssc.parentCategory) && ssc.level === 2
				)
				
				const allCategoryNames = [
					mainCat.name,
					...subCats.map((sc: any) => sc.name),
					...subSubCats.map((ssc: any) => ssc.name)
				]
				
				const count = await Product.countDocuments({ 
					$or: [
						{ category: { $in: allCategoryNames } },
						{ subCategory: { $in: allCategoryNames } },
						{ subSubCategory: { $in: allCategoryNames } }
					]
				})
				
				// Get sub-categories with counts
				const subCategoriesData = await Promise.all(
					subCats.map(async (subCat: any) => {
						const subSubCatsForSub = dbCategories.filter((ssc: any) =>
							ssc.parentCategory && String(ssc.parentCategory._id) === String(subCat._id) && ssc.level === 2
						)
						
						const subSubNames = subSubCatsForSub.map((ssc: any) => ssc.name)
						const subCount = await Product.countDocuments({
							$or: [
								{ category: subCat.name },
								{ subCategory: subCat.name },
								{ subSubCategory: subCat.name },
								{ subSubCategory: { $in: subSubNames } }
							]
						})
						
						// Get sub-sub-categories with counts
						const subSubCategoriesData = await Promise.all(
							subSubCatsForSub.map(async (subSubCat: any) => {
								const subSubCount = await Product.countDocuments({ 
									$or: [
										{ category: subSubCat.name },
										{ subCategory: subSubCat.name },
										{ subSubCategory: subSubCat.name }
									]
								})
								return {
									_id: String(subSubCat._id),
									name: String(subSubCat.name),
									level: 2,
									count: Number(subSubCount),
									displayOrder: Number(subSubCat.displayOrder ?? 1000),
									image: subSubCat.image ? String(subSubCat.image) : ''
								}
							})
						)
						
						return {
							_id: String(subCat._id),
							name: String(subCat.name),
							level: 1,
							count: Number(subCount),
							displayOrder: Number(subCat.displayOrder ?? 1000),
							image: subCat.image ? String(subCat.image) : '',
							subCategories: subSubCategoriesData
								.filter(Boolean)
								.sort((a: any, b: any) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
						}
					})
				)
				
				return {
					_id: String(mainCat._id),
					name: String(mainCat.name),
					level: 0,
					count: Number(count),
					image: mainCat.image ? String(mainCat.image) : '',
					description: mainCat.description ? String(mainCat.description) : '',
					displayOrder: Number(mainCat.displayOrder ?? 1000),
					isActive: mainCat.isActive !== false,
					subCategories: subCategoriesData
						.filter(Boolean)
						.sort((a: any, b: any) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
				}
			})
		)
		
		return hierarchicalData
			.filter((c): c is NonNullable<typeof c> => c !== null && !!c.name)
			.sort((a, b) => (a.displayOrder !== b.displayOrder ? a.displayOrder - b.displayOrder : a.name.localeCompare(b.name)))
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
		<main className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
			<div className="container-pg py-8 sm:py-12">
				{/* Header Section */}
				<div className="text-center mb-8 sm:mb-12">
					<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3">
						Shop by Category
					</h1>
					<p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
						Browse our wide selection of products organized by category. Find exactly what you need with our easy-to-navigate category structure.
					</p>
				</div>
				
				{/* Categories Grid */}
				<div className="grid gap-6 sm:gap-8">
					{categories.map((mainCat: any) => {
						const catNameLower = mainCat.name.toLowerCase()
						const imageUrl = mainCat.image || categoryImages[catNameLower] || ''
						const hasSubCategories = mainCat.subCategories && mainCat.subCategories.length > 0
						
						return (
							<div
								key={mainCat._id || mainCat.name}
								className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
							>
								{/* Main Category Card */}
								<Link
									href={`/products?category=${encodeURIComponent(mainCat.name)}`}
									className="block group"
								>
									<div className="p-4 sm:p-6">
										<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
											{/* Category Image */}
											<div className="relative w-full sm:w-32 md:w-40 h-32 sm:h-32 md:h-40 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
												{imageUrl && imageUrl !== '/categories/default.jpg' ? (
													imageUrl.startsWith('data:') ? (
														<img
															src={imageUrl}
															alt={mainCat.name}
															className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
															loading="lazy"
															decoding="async"
														/>
													) : (
														<Image
															src={imageUrl}
															alt={mainCat.name}
															fill
															className="object-cover group-hover:scale-110 transition-transform duration-300"
															sizes="(max-width: 640px) 100vw, 160px"
															loading="lazy"
														/>
													)
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<Package className="h-12 w-12 text-gray-400" />
													</div>
												)}
											</div>
											
											{/* Category Info */}
											<div className="flex-1 min-w-0">
												<div className="flex items-start justify-between gap-4">
													<div className="flex-1">
														<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 group-hover:text-brand-accent transition-colors">
															{mainCat.name}
														</h2>
														{mainCat.description && (
															<p className="text-sm sm:text-base text-slate-600 mb-3 line-clamp-2">
																{mainCat.description}
															</p>
														)}
														<div className="flex items-center gap-4">
															<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent/10 text-brand-accent rounded-full text-sm font-semibold">
																<Package className="h-4 w-4" />
																{mainCat.count || 0} {mainCat.count === 1 ? 'product' : 'products'}
															</span>
															{hasSubCategories && (
																<span className="text-sm text-slate-500">
																	{mainCat.subCategories.length} {mainCat.subCategories.length === 1 ? 'subcategory' : 'subcategories'}
																</span>
															)}
														</div>
													</div>
													<ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-brand-accent transition-colors flex-shrink-0 mt-1" />
												</div>
											</div>
										</div>
									</div>
								</Link>
								
								{/* Subcategories Section */}
								{hasSubCategories && (
									<div className="border-t border-gray-100 bg-gray-50/50">
										<div className="p-4 sm:p-6">
											<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
												Subcategories
											</h3>
											<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
												{mainCat.subCategories.map((subCat: any) => {
													const subImageUrl = subCat.image || ''
													const hasSubSubCategories = subCat.subCategories && subCat.subCategories.length > 0
													
													return (
														<div key={subCat._id || subCat.name} className="group">
															<Link
																href={`/products?category=${encodeURIComponent(mainCat.name)}&subCategory=${encodeURIComponent(subCat.name)}`}
																className="block bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:border-brand-accent hover:shadow-md transition-all duration-200"
															>
																<div className="flex items-start gap-3">
																	{subImageUrl && subImageUrl.startsWith('data:') ? (
																		<div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
																			<img
																				src={subImageUrl}
																				alt={subCat.name}
																				className="w-full h-full object-cover"
																				loading="lazy"
																				decoding="async"
																			/>
																		</div>
																	) : subImageUrl ? (
																		<div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
																			<Image
																				src={subImageUrl}
																				alt={subCat.name}
																				fill
																				className="object-cover"
																				sizes="56px"
																				loading="lazy"
																			/>
																		</div>
																	) : (
																		<div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
																			<Package className="h-6 w-6 text-gray-400" />
																		</div>
																	)}
																	<div className="flex-1 min-w-0">
																		<h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 group-hover:text-brand-accent transition-colors line-clamp-2">
																			{subCat.name}
																		</h4>
																		<div className="flex items-center gap-2 flex-wrap">
																			<span className="text-xs text-slate-600 font-medium">
																				{subCat.count || 0} {subCat.count === 1 ? 'product' : 'products'}
																			</span>
																			{hasSubSubCategories && (
																				<span className="text-xs text-slate-500">
																					• {subCat.subCategories.length} {subCat.subCategories.length === 1 ? 'sub' : 'subs'}
																				</span>
																			)}
																		</div>
																	</div>
																	<ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-accent transition-colors flex-shrink-0 mt-1" />
																</div>
															</Link>
															
															{/* Sub-Subcategories (if any) */}
															{hasSubSubCategories && (
																<div className="mt-2 ml-16 sm:ml-18 pl-3 border-l-2 border-gray-200 space-y-1.5">
																	{subCat.subCategories.map((subSubCat: any) => (
																		<Link
																			key={subSubCat._id || subSubCat.name}
																			href={`/products?category=${encodeURIComponent(mainCat.name)}&subCategory=${encodeURIComponent(subSubCat.name)}`}
																			className="block text-xs sm:text-sm text-slate-600 hover:text-brand-accent transition-colors py-1"
																		>
																			{subSubCat.name} <span className="text-slate-400">({subSubCat.count || 0})</span>
																		</Link>
																	))}
																</div>
															)}
														</div>
													)
												})}
											</div>
										</div>
									</div>
								)}
							</div>
						)
					})}
				</div>
				
				{categories.length === 0 && (
					<div className="text-center py-16">
						<Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
						<p className="text-lg text-slate-600 mb-2">No categories available at the moment.</p>
						<Link href="/" className="inline-block mt-4 text-brand-accent hover:underline font-medium">
							Return to homepage
						</Link>
					</div>
				)}
			</div>
		</main>
	)
}
