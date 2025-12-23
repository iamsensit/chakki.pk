import Link from 'next/link'
import ProductCard from '@/app/components/product/ProductCard'
import ProductFilters from './ProductFilters'
import MobileSearchBar from '@/app/components/home/MobileSearchBar'

function buildQuery(params: Record<string, any>) {
	const search = new URLSearchParams()
	Object.entries(params).forEach(([k, v]) => {
		if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
	})
	return search.toString()
}

async function fetchProducts(searchParams: Record<string, string | undefined>) {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
	const url = `${baseUrl}/api/products?${buildQuery({
		q: searchParams.q,
		category: searchParams.category,
		brand: searchParams.brand,
		inStock: searchParams.inStock,
		minPrice: searchParams.minPrice,
		maxPrice: searchParams.maxPrice,
		sort: searchParams.sort,
		page: searchParams.page ?? '1',
		limit: searchParams.limit ?? '20',
	})}`
	const res = await fetch(url, { cache: 'no-store' })
	if (!res.ok) return { items: [], total: 0, page: 1, limit: 20 }
	const json = await res.json()
	return json.data ?? { items: [], total: 0, page: 1, limit: 20 }
}

async function fetchMeta() {
	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/products/meta`, { cache: 'no-store' })
	if (!res.ok) return { categories: [], brands: [] }
	const json = await res.json()
	return json.data ?? { categories: [], brands: [] }
}

export default async function ProductsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
	const [{ items, total }, meta] = await Promise.all([fetchProducts(searchParams), fetchMeta()])
	return (
		<div className="pb-16 md:pb-0">
			{/* Mobile Search Bar - Only visible on mobile */}
			<MobileSearchBar />
			
			<div className="container-pg py-2 sm:py-4 md:py-6">
				<div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
					<ProductFilters categories={meta.categories} brands={meta.brands} />
					<section className="lg:col-span-3">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
							<h1 className="text-lg sm:text-xl md:text-2xl font-semibold">All Products</h1>
							<div className="text-xs sm:text-sm text-slate-600">{total} results</div>
						</div>
					{items.length === 0 ? (
						<div className="mt-6 sm:mt-10 rounded-md border p-6 sm:p-8 text-center text-sm sm:text-base text-slate-600">No products found. Try adjusting filters or keywords.</div>
					) : (
						<div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
							{items.map((p: any, i: number) => (
								<ProductCard 
									key={p.id ?? p._id ?? i}
									id={p.id ?? String(p._id)} 
									title={p.title} 
									description={p.description} 
									badges={p.badges} 
									images={p.images} 
									variants={p.variants}
									href={`/products/${p.slug ?? (p.id ?? p._id)}`}
								/>
							))}
						</div>
					)}
					</section>
				</div>
			</div>
		</div>
	)
}
