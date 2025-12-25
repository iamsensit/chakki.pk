"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useDebounce } from '@/app/hooks/useDebounce'
import { Filter, X } from 'lucide-react'

interface ProductFiltersProps {
	categories: string[]
	brands: string[]
}

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
	const [sort, setSort] = useState(searchParams.get('sort') || 'popularity')
	
	// Debounce search input to avoid too many updates
	const debouncedSearch = useDebounce(search, 500)
	
	// Update URL when filters change
	useEffect(() => {
		const params = new URLSearchParams()
		
		if (debouncedSearch) params.set('q', debouncedSearch)
		if (category) params.set('category', category)
		if (brand) params.set('brand', brand)
		if (minPrice) params.set('minPrice', minPrice)
		if (maxPrice) params.set('maxPrice', maxPrice)
		if (inStock) params.set('inStock', 'true')
		if (sort && sort !== 'popularity') params.set('sort', sort)
		
		router.push(`/products?${params.toString()}`, { scroll: false })
	}, [debouncedSearch, category, brand, minPrice, maxPrice, inStock, sort, router])
	
	return (
		<>
			{/* Mobile Filter Toggle Button - Inline below search bar */}
			<div className="lg:hidden mb-3">
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="w-full flex items-center justify-between bg-white border border-gray-300  px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
					aria-label="Toggle filters"
				>
					<div className="flex items-center gap-2">
						<Filter className="h-4 w-4 text-brand-accent" strokeWidth={2.5} />
						<span>Filters</span>
					</div>
					{isOpen ? (
						<X className="h-4 w-4 text-gray-500" strokeWidth={2.5} />
					) : (
						<svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					)}
				</button>
			</div>

			{/* Filters Section - Collapsible on mobile, always visible on desktop */}
			<aside className={`lg:col-span-1  border p-3 sm:p-4 h-fit ${
				isOpen 
					? 'block mb-4 lg:mb-0' 
					: 'hidden lg:block'
			}`}>
				<div className="lg:flex lg:items-center lg:justify-between mb-3">
					<div className="text-base sm:text-lg font-semibold text-gray-900">Filters</div>
				</div>
				<div className="mt-0 lg:mt-3 grid gap-3 sm:gap-4">
					{/* Hide search input on mobile since we have MobileSearchBar */}
					<div className="hidden lg:block">
						<input 
							name="q" 
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search..." 
							className="input-enhanced w-full" 
						/>
					</div>
				<div>
					<label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
					<select 
						name="category" 
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						className="input-enhanced w-full h-10 text-sm"
					>
						<option value="">All</option>
						{categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
					</select>
				</div>
				<div>
					<label className="text-sm font-medium text-gray-700 mb-2 block">Brand</label>
					<select 
						name="brand" 
						value={brand}
						onChange={(e) => setBrand(e.target.value)}
						className="input-enhanced w-full h-10 text-sm"
					>
						<option value="">All</option>
						{brands.map((b: string) => <option key={b} value={b}>{b}</option>)}
					</select>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="text-sm font-medium text-gray-700 mb-2 block">Min Price</label>
						<input 
							name="minPrice" 
							value={minPrice}
							onChange={(e) => setMinPrice(e.target.value)}
							type="number" 
							placeholder="Min"
							className="input-enhanced w-full h-10 text-sm" 
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700 mb-2 block">Max Price</label>
						<input 
							name="maxPrice" 
							value={maxPrice}
							onChange={(e) => setMaxPrice(e.target.value)}
							type="number" 
							placeholder="Max"
							className="input-enhanced w-full h-10 text-sm" 
						/>
					</div>
				</div>
				<div className="flex items-center gap-2.5 py-1">
					<input 
						id="inStock" 
						name="inStock" 
						type="checkbox" 
						checked={inStock}
						onChange={(e) => setInStock(e.target.checked)}
						className="h-4 w-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent" 
					/>
					<label htmlFor="inStock" className="text-sm font-medium text-gray-700 cursor-pointer">In stock</label>
				</div>
				<div>
					<label className="text-sm font-medium text-gray-700 mb-2 block">Sort by</label>
					<select 
						name="sort" 
						value={sort}
						onChange={(e) => setSort(e.target.value)}
						className="input-enhanced w-full h-10 text-sm"
					>
						<option value="popularity">Popularity</option>
						<option value="price_asc">Price: Low to High</option>
						<option value="price_desc">Price: High to Low</option>
						<option value="newest">Newest</option>
					</select>
				</div>
				<div className="pt-2">
					<Link 
						href="/products" 
						className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium  px-4 py-2.5 text-sm transition-colors"
					>
						Reset
					</Link>
				</div>
			</div>
		</aside>
		</>
	)
}

export default function ProductFilters({ categories, brands }: ProductFiltersProps) {
	return (
		<Suspense fallback={<div className="lg:col-span-1  border p-3 sm:p-4 h-fit"><div className="skeleton h-64" /></div>}>
			<ProductFiltersInner categories={categories} brands={brands} />
		</Suspense>
	)
}

