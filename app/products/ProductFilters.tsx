"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useDebounce } from '@/app/hooks/useDebounce'
import { Filter, X, RotateCcw, Check, Sparkles, Tag } from 'lucide-react'

interface CategoryMeta {
	name: string
	count?: number
}

interface ProductFiltersProps {
	categories: (string | CategoryMeta)[]
	brands: string[]
}

const PRICE_PRESETS = [
	{ label: 'All Prices', min: '', max: '' },
	{ label: 'Under Rs. 500', min: '', max: '500' },
	{ label: 'Rs. 500 - 1,500', min: '500', max: '1500' },
	{ label: 'Rs. 1,500 - 3,000', min: '1500', max: '3000' },
	{ label: 'Above Rs. 3,000', min: '3000', max: '' },
]

function ProductFiltersInner({ categories, brands }: ProductFiltersProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	
	const [isOpen, setIsOpen] = useState(false)
	const [search, setSearch] = useState(searchParams.get('q') || '')
	const [category, setCategory] = useState(searchParams.get('category') || '')
	const [brand, setBrand] = useState(searchParams.get('brand') || '')
	const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '')
	const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '')
	const [inStock, setInStock] = useState(searchParams.get('inStock') === 'true')
	const [onSale, setOnSale] = useState(searchParams.get('onSale') === 'true' || searchParams.get('badge') === 'discount')
	const [sort, setSort] = useState(searchParams.get('sort') || 'popularity')
	
	// Sync with searchParams on back/forward navigation
	useEffect(() => {
		setSearch(searchParams.get('q') || '')
		setCategory(searchParams.get('category') || '')
		setBrand(searchParams.get('brand') || '')
		setMinPrice(searchParams.get('minPrice') || '')
		setMaxPrice(searchParams.get('maxPrice') || '')
		setInStock(searchParams.get('inStock') === 'true')
		setOnSale(searchParams.get('onSale') === 'true' || searchParams.get('badge') === 'discount')
		setSort(searchParams.get('sort') || 'popularity')
	}, [searchParams])

	const debouncedSearch = useDebounce(search, 400)
	
	// Update URL when filters change
	useEffect(() => {
		const params = new URLSearchParams()
		
		if (debouncedSearch) params.set('q', debouncedSearch)
		if (category) params.set('category', category)
		if (brand) params.set('brand', brand)
		if (minPrice) params.set('minPrice', minPrice)
		if (maxPrice) params.set('maxPrice', maxPrice)
		if (inStock) params.set('inStock', 'true')
		if (onSale) params.set('onSale', 'true')
		if (sort && sort !== 'popularity') params.set('sort', sort)
		
		const newQuery = params.toString()
		const currentQuery = searchParams.toString()
		if (newQuery !== currentQuery) {
			router.push(`/products?${newQuery}` as any, { scroll: false })
		}
	}, [debouncedSearch, category, brand, minPrice, maxPrice, inStock, onSale, sort, router, searchParams])

	const categoryList = categories.map(c => typeof c === 'string' ? { name: c, count: undefined } : c)
	const hasActiveFilters = !!(search || category || brand || minPrice || maxPrice || inStock || onSale || (sort && sort !== 'popularity'))

	return (
		<>
			{/* Mobile Filter Toggle Button */}
			<div className="lg:hidden mb-3">
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="w-full flex items-center justify-between bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3 text-sm font-bold text-[#2D3748] shadow-xs hover:border-[#7EB338] transition-colors"
					aria-label="Toggle filters"
				>
					<div className="flex items-center gap-2">
						<Filter className="h-4 w-4 text-[#7EB338]" />
						<span>Filters {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-[#F08C38] inline-block" />}</span>
					</div>
					{isOpen ? (
						<X className="h-4 w-4 text-[#718096]" />
					) : (
						<span className="text-xs text-[#7EB338] font-semibold">Show Filters</span>
					)}
				</button>
			</div>

			{/* Filters Sidebar */}
			<aside className={`lg:col-span-1 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-5 h-fit ${
				isOpen ? 'block mb-4 lg:mb-0' : 'hidden lg:block'
			}`}>
				{/* Filter Header */}
				<div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
					<div className="flex items-center gap-2">
						<div className="p-1.5 rounded-lg bg-[#7EB338]/10 text-[#7EB338]">
							<Filter className="h-4 w-4" />
						</div>
						<h3 className="text-sm font-extrabold text-[#2D3748] uppercase tracking-wide">
							Filters
						</h3>
					</div>

					{hasActiveFilters && (
						<Link
							href="/products"
							onClick={() => {
								setSearch('')
								setCategory('')
								setBrand('')
								setMinPrice('')
								setMaxPrice('')
								setInStock(false)
								setOnSale(false)
								setSort('popularity')
							}}
							className="text-xs font-bold text-[#F08C38] hover:underline flex items-center gap-1"
						>
							<RotateCcw className="h-3 w-3" />
							Reset
						</Link>
					)}
				</div>

				<div className="space-y-5">
					{/* Search Input */}
					<div>
						<label className="text-xs font-bold text-[#2D3748] uppercase tracking-wider mb-1.5 block">
							Keyword Search
						</label>
						<input 
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search in products..." 
							className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3 py-2 text-xs text-[#2D3748] placeholder-[#718096] focus:bg-white focus:border-[#7EB338] focus:ring-1 focus:ring-[#7EB338] outline-none transition-all" 
						/>
					</div>

					{/* Category Selector */}
					<div>
						<label className="text-xs font-bold text-[#2D3748] uppercase tracking-wider mb-2 block">
							Category
						</label>
						<div className="space-y-1 max-h-52 overflow-y-auto pr-1">
							<button
								type="button"
								onClick={() => setCategory('')}
								className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
									category === ''
										? 'bg-[#7EB338] text-white shadow-xs'
										: 'text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]'
								}`}
							>
								<span>All Categories</span>
								{category === '' && <Check className="h-3.5 w-3.5" />}
							</button>

							{categoryList.map((cat) => {
								const isSelected = category.toLowerCase() === cat.name.toLowerCase()
								return (
									<button
										key={cat.name}
										type="button"
										onClick={() => setCategory(isSelected ? '' : cat.name)}
										className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
											isSelected
												? 'bg-[#7EB338] text-white shadow-xs'
												: 'text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]'
										}`}
									>
										<span className="truncate">{cat.name}</span>
										{cat.count !== undefined && cat.count > 0 ? (
											<span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
												isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#718096]'
											}`}>
												{cat.count}
											</span>
										) : isSelected ? (
											<Check className="h-3.5 w-3.5" />
										) : null}
									</button>
								)
							})}
						</div>
					</div>

					{/* Quick Price Ranges */}
					<div>
						<label className="text-xs font-bold text-[#2D3748] uppercase tracking-wider mb-2 block">
							Price Range (PKR)
						</label>
						<div className="grid grid-cols-2 gap-2 mb-2">
							{PRICE_PRESETS.slice(1).map((preset) => {
								const isSelected = minPrice === preset.min && maxPrice === preset.max
								return (
									<button
										key={preset.label}
										type="button"
										onClick={() => {
											if (isSelected) {
												setMinPrice('')
												setMaxPrice('')
											} else {
												setMinPrice(preset.min)
												setMaxPrice(preset.max)
											}
										}}
										className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
											isSelected
												? 'bg-[#7EB338] text-white border-[#7EB338]'
												: 'bg-white text-[#2D3748] border-[#E2E8F0] hover:border-[#7EB338]'
										}`}
									>
										{preset.label}
									</button>
								)
							})}
						</div>

						{/* Manual Min / Max Inputs */}
						<div className="grid grid-cols-2 gap-2 pt-1">
							<input 
								type="number"
								value={minPrice}
								onChange={(e) => setMinPrice(e.target.value)}
								placeholder="Min Rs." 
								className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3 py-1.5 text-xs text-[#2D3748] focus:bg-white focus:border-[#7EB338] outline-none" 
							/>
							<input 
								type="number"
								value={maxPrice}
								onChange={(e) => setMaxPrice(e.target.value)}
								placeholder="Max Rs." 
								className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3 py-1.5 text-xs text-[#2D3748] focus:bg-white focus:border-[#7EB338] outline-none" 
							/>
						</div>
					</div>

					{/* Special Offers & Deals Toggle */}
					<div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
						<label className="flex items-center gap-2.5 cursor-pointer select-none">
							<input 
								type="checkbox" 
								checked={onSale}
								onChange={(e) => setOnSale(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300 text-[#F08C38] focus:ring-[#F08C38]" 
							/>
							<span className="text-xs font-bold text-[#F08C38] flex items-center gap-1">
								<Tag className="h-3.5 w-3.5" />
								On Sale / Discounted Deals
							</span>
						</label>

						<label className="flex items-center gap-2.5 cursor-pointer select-none">
							<input 
								type="checkbox" 
								checked={inStock}
								onChange={(e) => setInStock(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300 text-[#7EB338] focus:ring-[#7EB338]" 
							/>
							<span className="text-xs font-semibold text-[#2D3748]">
								In Stock Only
							</span>
						</label>
					</div>

					{/* Brands Filter */}
					{brands && brands.length > 0 && (
						<div>
							<label className="text-xs font-bold text-[#2D3748] uppercase tracking-wider mb-1.5 block">
								Brand
							</label>
							<select 
								value={brand}
								onChange={(e) => setBrand(e.target.value)}
								className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3 py-2 text-xs font-semibold text-[#2D3748] focus:bg-white focus:border-[#7EB338] outline-none cursor-pointer"
							>
								<option value="">All Brands</option>
								{brands.map((b) => (
									<option key={b} value={b}>
										{b}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Sort Dropdown */}
					<div>
						<label className="text-xs font-bold text-[#2D3748] uppercase tracking-wider mb-1.5 block">
							Sort Products
						</label>
						<select 
							value={sort}
							onChange={(e) => setSort(e.target.value)}
							className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3 py-2 text-xs font-semibold text-[#2D3748] focus:bg-white focus:border-[#7EB338] outline-none cursor-pointer"
						>
							<option value="popularity">Most Popular</option>
							<option value="newest">Newest Arrivals</option>
							<option value="price_asc">Price: Low to High</option>
							<option value="price_desc">Price: High to Low</option>
						</select>
					</div>

					{/* Reset Action */}
					{hasActiveFilters && (
						<div className="pt-2">
							<button 
								onClick={() => {
									setSearch('')
									setCategory('')
									setBrand('')
									setMinPrice('')
									setMaxPrice('')
									setInStock(false)
									setOnSale(false)
									setSort('popularity')
								}}
								className="w-full text-center bg-slate-100 hover:bg-[#F5EFE0] hover:text-[#7EB338] text-[#2D3748] font-bold rounded-xl px-4 py-2.5 text-xs transition-colors"
							>
								Clear All Filters
							</button>
						</div>
					)}
				</div>
			</aside>
		</>
	)
}

export default function ProductFilters({ categories, brands }: ProductFiltersProps) {
	return (
		<Suspense fallback={<div className="lg:col-span-1 bg-white rounded-2xl border border-[#E2E8F0] p-4 h-64 skeleton" />}>
			<ProductFiltersInner categories={categories} brands={brands} />
		</Suspense>
	)
}
