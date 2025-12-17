import Link from 'next/link'
import { ShoppingCart, BarChart3, PlusCircle, PencilLine, MapPin } from 'lucide-react'

export default function AdminHome() {
	return (
		<div className="mx-auto w-full max-w-5xl">
			<h1 className="text-2xl font-semibold">Admin</h1>
			<div className="mt-6 grid gap-4 sm:grid-cols-3">
				<Link href="/admin/products/new" className="group rounded-md border p-4 hover:bg-brand-light/50 transition-colors">
					<div className="flex items-center gap-2 font-medium">
						<PlusCircle className="h-4 w-4 text-brand-accent group-hover:scale-110 transition-transform" />
						Add product
					</div>
					<div className="mt-1 text-sm text-slate-600">Create a new product with images, variants, and tiers.</div>
				</Link>
        <Link href="/admin/categories" className="group rounded-md border p-4 hover:bg-brand-light/50 transition-colors">
          <div className="flex items-center gap-2 font-weight">
            <PencilLine className="h-4 w-4 text-brand-accent group-hover:scale-110 transition-transform" />
            Categories
          </div>
          <div className="mt-1 text-sm text-slate-600">Attach images and sort order for existing categories.</div>
        </Link>
				<Link href="/admin/products/edit" className="group rounded-md border p-4 hover:bg-brand-light/50 transition-colors">
					<div className="flex items-center gap-2 font-medium">
						<PencilLine className="h-4 w-4 text-brand-accent group-hover:scale-110 transition-transform" />
						Edit products
					</div>
					<div className="mt-1 text-sm text-slate-600">Search & update stock, price, and details.</div>
				</Link>
				<Link href="/pos" className="group rounded-md border p-4 hover:bg-brand-light/50 transition-colors">
					<div className="flex items-center gap-2 font-medium">
						<ShoppingCart className="h-4 w-4 text-brand-accent group-hover:scale-110 transition-transform" />
						POS Register
					</div>
					<div className="mt-1 text-sm text-slate-600">Open the in‑store cash/card checkout for walk‑in customers.</div>
				</Link>
        <Link href="/admin/accounts" className="group rounded-md border p-4 hover:bg-brand-light/50 transition-colors">
          <div className="flex items-center gap-2 font-medium">
            <BarChart3 className="h-4 w-4 text-brand-accent group-hover:scale-110 transition-transform" />
            Accounts
          </div>
          <div className="mt-1 text-sm text-slate-600">Cashflows, expenses, salaries, and financial reports.</div>
        </Link>
        <Link href="/admin/delivery" className="group rounded-md border p-4 hover:bg-brand-light/50 transition-colors">
          <div className="flex items-center gap-2 font-medium">
            <MapPin className="h-4 w-4 text-brand-accent group-hover:scale-110 transition-transform" />
            Delivery Areas
          </div>
          <div className="mt-1 text-sm text-slate-600">Manage delivery cities, shop locations, and delivery radius.</div>
        </Link>
				<Link href="/api/meta/analytics" className="group rounded-md border p-4 hover:bg-brand-light/50 transition-colors">
					<div className="flex items-center gap-2 font-medium">
						<BarChart3 className="h-4 w-4 text-brand-accent group-hover:scale-110 transition-transform" />
						Analytics (API)
					</div>
					<div className="mt-1 text-sm text-slate-600">Quick JSON metrics for now.</div>
				</Link>
			</div>
		</div>
	)
}
