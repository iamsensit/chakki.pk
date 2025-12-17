import Link from 'next/link'

export default function Footer() {
	return (
		<footer className="border-t mt-10">
			<div className="container-pg py-8 grid gap-6 sm:grid-cols-3 text-sm text-slate-600">
				<div>
					<div className="text-slate-900 font-semibold">Chakki.pk</div>
					<p className="mt-2">Wholesale grains & essentials at fair prices.</p>
				</div>
				<div>
					<div className="font-medium text-slate-900">Support</div>
					<ul className="mt-2 space-y-1">
						<li><Link href="/help" className="hover:text-brand-accent transition-colors">Help Center</Link></li>
						<li><Link href="/shipping" className="hover:text-brand-accent transition-colors">Shipping & Delivery</Link></li>
						<li><Link href="/returns" className="hover:text-brand-accent transition-colors">Returns</Link></li>
					</ul>
				</div>
				<div>
					<div className="font-medium text-slate-900">Company</div>
					<ul className="mt-2 space-y-1">
						<li><Link href="/about" className="hover:text-brand-accent transition-colors">About</Link></li>
						<li><Link href="/contact" className="hover:text-brand-accent transition-colors">Contact</Link></li>
						<li><Link href="/terms" className="hover:text-brand-accent transition-colors">Terms & Privacy</Link></li>
					</ul>
				</div>
			</div>
			<div className="border-t">
				<div className="container-pg py-4 text-xs text-slate-500">© {new Date().getFullYear()} Chakki.pk</div>
			</div>
		</footer>
	)
}
