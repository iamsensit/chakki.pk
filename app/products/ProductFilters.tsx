"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useDebounce } from '@/app/hooks/useDebounce'

interface ProductFiltersProps {
	categories: string[]
	brands: string[]
}

function ProductFiltersInner({ categories, brands }: ProductFiltersProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	
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
		<aside className="lg:col-span-1 rounded-md border p-3 sm:p-4 h-fit">
			<div className="text-sm font-medium">Filters</div>
			<div className="mt-3 grid gap-3">
				<input 
					name="q" 
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search..." 
					className="input-enhanced w-full" 
				/>
				<div>
					<label className="text-sm mb-1.5 block">Category</label>
					<select 
						name="category" 
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						className="input-enhanced w-full"
					>
						<option value="">All</option>
						{categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
					</select>
				</div>
				<div>
					<label className="text-sm mb-1.5 block">Brand</label>
					<select 
						name="brand" 
						value={brand}
						onChange={(e) => setBrand(e.target.value)}
						className="input-enhanced w-full"
					>
						<option value="">All</option>
						{brands.map((b: string) => <option key={b} value={b}>{b}</option>)}
					</select>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="text-sm mb-1.5 block">Min Price</label>
						<input 
							name="minPrice" 
							value={minPrice}
							onChange={(e) => setMinPrice(e.target.value)}
							type="number" 
							className="input-enhanced w-full" 
						/>
					</div>
					<div>
						<label className="text-sm mb-1.5 block">Max Price</label>
						<input 
							name="maxPrice" 
							value={maxPrice}
							onChange={(e) => setMaxPrice(e.target.value)}
							type="number" 
							className="input-enhanced w-full" 
						/>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<input 
						id="inStock" 
						name="inStock" 
						type="checkbox" 
						checked={inStock}
						onChange={(e) => setInStock(e.target.checked)}
						className="rounded border-gray-300" 
					/>
					<label htmlFor="inStock" className="text-sm">In stock</label>
				</div>
				<div>
					<label className="text-sm mb-1.5 block">Sort by</label>
					<select 
						name="sort" 
						value={sort}
						onChange={(e) => setSort(e.target.value)}
						className="input-enhanced w-full"
					>
						<option value="popularity">Popularity</option>
						<option value="price_asc">Price: Low to High</option>
						<option value="price_desc">Price: High to Low</option>
						<option value="newest">Newest</option>
					</select>
				</div>
				<div className="flex gap-2">
					<Link 
						href="/products" 
						className="btn-primary rounded-md px-3 py-2 text-sm whitespace-nowrap"
					>
						Reset
					</Link>
				</div>
			</div>
		</aside>
	)
}

export default function ProductFilters({ categories, brands }: ProductFiltersProps) {
	return (
		<Suspense fallback={<div className="lg:col-span-1 rounded-md border p-3 sm:p-4 h-fit"><div className="skeleton h-64" /></div>}>
			<ProductFiltersInner categories={categories} brands={brands} />
		</Suspense>
	)
}

