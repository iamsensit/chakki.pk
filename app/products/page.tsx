import Link from 'next/link'
import ProductCard from '@/app/components/product/ProductCard'
import { redirect } from 'next/navigation'

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
		<div className="container-pg py-4 sm:py-6">
			<div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
				<aside className="lg:col-span-1 rounded-md border p-3 sm:p-4 h-fit">
					<div className="text-sm font-medium">Filters</div>
					<form className="mt-3 grid gap-3">
						<input name="q" defaultValue={searchParams.q} placeholder="Search..." className="w-full rounded-md border px-3 py-2 text-sm" />
						<div>
							<label className="text-sm">Category</label>
							<select name="category" defaultValue={searchParams.category} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
								<option value="">All</option>
								{meta.categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
							</select>
						</div>
						<div>
							<label className="text-sm">Brand</label>
							<select name="brand" defaultValue={searchParams.brand} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
								<option value="">All</option>
								{meta.brands.map((b: string) => <option key={b} value={b}>{b}</option>)}
							</select>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="text-sm">Min Price</label>
								<input name="minPrice" defaultValue={searchParams.minPrice} type="number" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="text-sm">Max Price</label>
								<input name="maxPrice" defaultValue={searchParams.maxPrice} type="number" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
							</div>
						</div>
						<div className="flex items-center gap-2">
							<input id="inStock" name="inStock" type="checkbox" defaultChecked={searchParams.inStock === 'true'} className="rounded border-gray-300" />
							<label htmlFor="inStock" className="text-sm">In stock</label>
						</div>
						<div>
							<label className="text-sm">Sort by</label>
							<select name="sort" defaultValue={searchParams.sort} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
								<option value="popularity">Popularity</option>
								<option value="price_asc">Price: Low to High</option>
								<option value="price_desc">Price: High to Low</option>
								<option value="newest">Newest</option>
							</select>
						</div>
						<div className="flex gap-2">
							<button formAction={async (fd: FormData) => {
								'use server'
								const entries = Object.fromEntries(fd.entries()) as Record<string, string>
								const params: any = { ...entries }
								if (!params.inStock) delete params.inStock; else params.inStock = 'true'
								redirect(`/products?${buildQuery(params)}`)
							}} className="rounded-md bg-brand-accent px-3 py-2 text-white text-sm">Apply</button>
							<Link href="/products" className="rounded-md border px-3 py-2 text-sm">Reset</Link>
						</div>
					</form>
				</aside>
				<section className="lg:col-span-3">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
						<h1 className="text-xl sm:text-2xl font-semibold">All Products</h1>
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
	)
}
