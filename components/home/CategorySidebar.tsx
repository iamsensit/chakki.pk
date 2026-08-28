"use client"

import Link from 'next/link'
import {
	Apple,
	Milk,
	Wheat,
	Flame,
	Coffee,
	Fish,
	Cookie,
	Sparkles,
	ChevronRight,
	ShoppingBag,
	Carrot,
	Layers,
	Tag,
	CheckCircle,
	Headphones
} from 'lucide-react'

export type CategorySidebarItem = {
	name: string
	slug?: string
	image?: string
	productCount?: number
	isHot?: boolean
}

function getIconForCategory(name: string) {
	const lower = name.toLowerCase()
	if (lower.includes('atta') || lower.includes('flour') || lower.includes('grain') || lower.includes('wheat')) return Wheat
	if (lower.includes('milk') || lower.includes('dairy') || lower.includes('butter') || lower.includes('cheese')) return Milk
	if (lower.includes('daal') || lower.includes('pulse') || lower.includes('bean') || lower.includes('lentil') || lower.includes('mash')) return ShoppingBag
	if (lower.includes('spice') || lower.includes('masala') || lower.includes('salt') || lower.includes('chilli')) return Sparkles
	if (lower.includes('oil') || lower.includes('ghee')) return Flame
	if (lower.includes('fruit') || lower.includes('veg') || lower.includes('sabzi')) return Apple
	if (lower.includes('tea') || lower.includes('coffee') || lower.includes('beverage') || lower.includes('drink')) return Coffee
	if (lower.includes('meat') || lower.includes('fish') || lower.includes('chicken') || lower.includes('gosht') || lower.includes('seafood')) return Fish
	if (lower.includes('dry fruit') || lower.includes('nut') || lower.includes('bakery') || lower.includes('sweet') || lower.includes('snack')) return Cookie
	if (lower.includes('rice') || lower.includes('chawal') || lower.includes('sugar') || lower.includes('cheeni')) return Layers
	return Carrot
}

export default function CategorySidebar({
	categories = [],
	activeCategory,
}: {
	categories?: CategorySidebarItem[]
	activeCategory?: string
}) {
	const hasRealCategories = categories && categories.length > 0

	return (
		<div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 h-full flex flex-col justify-between">
			<div>
				<div className="mb-2 pb-3 border-b border-[#E2E8F0] flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="h-2 w-2 rounded-full bg-[#7EB338]" />
						<h3 className="text-sm font-bold uppercase tracking-wider text-[#2D3748]">
							{hasRealCategories ? 'Categories' : 'Quick Navigation'}
						</h3>
					</div>
					{hasRealCategories && (
						<Link
							href="/categories"
							className="text-xs font-semibold text-[#7EB338] hover:underline"
						>
							View All
						</Link>
					)}
				</div>

				<ul className="space-y-1">
					{hasRealCategories ? (
						categories.slice(0, 10).map((item, idx) => {
							const IconComponent = getIconForCategory(item.name)
							const targetSlug = item.slug || item.name
							const isActive = activeCategory && targetSlug && activeCategory.toLowerCase() === targetSlug.toLowerCase()

							return (
								<li key={item.name + idx}>
									<Link
										href={`/products?category=${encodeURIComponent(targetSlug)}` as any}
										className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
											isActive
												? 'bg-[#7EB338] text-white shadow-xs'
												: 'text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]'
										}`}
									>
										<div className="flex items-center gap-3 min-w-0">
											<div
												className={`p-1.5 rounded-lg transition-colors ${
													isActive
														? 'bg-white/20 text-white'
														: 'bg-slate-100 text-[#718096] group-hover:bg-white group-hover:text-[#7EB338]'
												}`}
											>
												<IconComponent className="h-4 w-4 flex-shrink-0" />
											</div>
											<span className="truncate">{item.name}</span>
										</div>

										<div className="flex items-center gap-1.5 flex-shrink-0">
											{item.productCount !== undefined && item.productCount > 0 ? (
												<span
													className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
														isActive
															? 'bg-white/20 text-white'
															: 'bg-slate-100 text-[#718096] group-hover:bg-white group-hover:text-[#7EB338]'
													}`}
												>
													{item.productCount}
												</span>
											) : null}
											<ChevronRight
												className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 ${
													isActive ? 'text-white' : 'text-[#718096] group-hover:text-[#7EB338]'
												}`}
											/>
										</div>
									</Link>
								</li>
							)
						})
					) : (
						/* If no categories exist in DB yet, show real store quick links */
						<>
							<li>
								<Link
									href="/products"
									className="group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338] transition-all"
								>
									<div className="flex items-center gap-3">
										<div className="p-1.5 rounded-lg bg-slate-100 text-[#718096] group-hover:bg-white group-hover:text-[#7EB338]">
											<ShoppingBag className="h-4 w-4" />
										</div>
										<span>All Products</span>
									</div>
									<ChevronRight className="h-3.5 w-3.5 text-[#718096] group-hover:text-[#7EB338]" />
								</Link>
							</li>
							<li>
								<Link
									href={"/products?onSale=true" as any}
									className="group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338] transition-all"
								>
									<div className="flex items-center gap-3">
										<div className="p-1.5 rounded-lg bg-slate-100 text-[#718096] group-hover:bg-white group-hover:text-[#F08C38]">
											<Tag className="h-4 w-4" />
										</div>
										<span>On Sale Deals</span>
									</div>
									<span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#F08C38]/15 text-[#F08C38]">
										SALE
									</span>
								</Link>
							</li>
							<li>
								<Link
									href={"/products?inStock=true" as any}
									className="group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338] transition-all"
								>
									<div className="flex items-center gap-3">
										<div className="p-1.5 rounded-lg bg-slate-100 text-[#718096] group-hover:bg-white group-hover:text-[#7EB338]">
											<CheckCircle className="h-4 w-4" />
										</div>
										<span>In Stock Items</span>
									</div>
									<ChevronRight className="h-3.5 w-3.5 text-[#718096] group-hover:text-[#7EB338]" />
								</Link>
							</li>
							<li>
								<Link
									href="/contact"
									className="group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338] transition-all"
								>
									<div className="flex items-center gap-3">
										<div className="p-1.5 rounded-lg bg-slate-100 text-[#718096] group-hover:bg-white group-hover:text-[#7EB338]">
											<Headphones className="h-4 w-4" />
										</div>
										<span>Customer Support</span>
									</div>
									<ChevronRight className="h-3.5 w-3.5 text-[#718096] group-hover:text-[#7EB338]" />
								</Link>
							</li>
						</>
					)}
				</ul>
			</div>

			{/* Bottom promotion banner inside sidebar */}
			<div className="mt-4 pt-3 border-t border-[#E2E8F0]">
				<Link
					href={"/products?onSale=true" as any}
					className="block p-3 rounded-xl bg-[#F5EFE0] border border-[#E2E8F0] hover:border-[#7EB338] transition-all group"
				>
					<div className="flex items-center justify-between mb-1">
						<span className="text-[10px] uppercase font-bold tracking-wider text-[#F08C38]">
							Special Deals
						</span>
						<span className="text-xs font-bold text-[#7EB338]">Wholesale</span>
					</div>
					<p className="text-xs font-bold text-[#2D3748] group-hover:text-[#7EB338] transition-colors">
						Direct Farm-Fresh Atta & Groceries
					</p>
				</Link>
			</div>
		</div>
	)
}
