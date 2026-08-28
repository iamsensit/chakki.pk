"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Phone, Sparkles } from 'lucide-react'

// Simple SVG Icons for Social Media for clean rendering
function FacebookIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill="currentColor" viewBox="0 0 24 24">
			<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
		</svg>
	)
}

function InstagramIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill="currentColor" viewBox="0 0 24 24">
			<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
		</svg>
	)
}

function WhatsAppIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill="currentColor" viewBox="0 0 24 24">
			<path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.073-2.025-.48-1.698-.705-2.793-2.454-2.879-2.569-.086-.115-.694-.924-.694-1.762 0-.838.435-1.25.59-1.422.155-.172.338-.216.45-.216.113 0 .227 0 .327.006.105.006.246-.04.385.294.144.348.491 1.199.534 1.287.043.088.072.19.014.305-.058.115-.087.187-.173.289l-.26.305c-.087.087-.177.181-.076.355.101.173.45 0.743.967 1.204.665.592 1.226.776 1.399.862.173.087.274.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086.159.058 1.01.477 1.183.564.173.087.289.13.332.203.044.073.044.419-.1 0.824zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.178L2 22l4.98-1.306C8.423 21.493 10.154 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
		</svg>
	)
}

function TwitterIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill="currentColor" viewBox="0 0 24 24">
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	)
}

const navLinks = [
	{ name: 'Home', href: '/' },
	{ name: 'Shop', href: '/products' },
	{ name: 'Categories', href: '/categories' },
	{ name: 'About Us', href: '/about' },
	{ name: 'FAQs & Help', href: '/help' },
	{ name: 'Contact', href: '/contact' },
]

export default function SubNav() {
	const pathname = usePathname()

	return (
		<div className="hidden lg:block bg-white border-b border-[#E2E8F0]">
			<div className="container-pg flex items-center justify-between h-11">
				{/* Left: Home Button + Navigation Links */}
				<div className="flex items-center gap-6">
					{/* Home Icon Button */}
					<Link
						href="/"
						className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all ${
							pathname === '/'
								? 'bg-[#7EB338] text-white shadow-sm'
								: 'bg-slate-100 text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]'
						}`}
						title="Home"
					>
						<Home className="h-4 w-4" />
					</Link>

					{/* Horizontal Navigation Menu */}
					<nav className="flex items-center gap-6 text-sm font-medium text-[#2D3748]">
						{navLinks.map((link) => {
							const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href))
							return (
								<Link
									key={link.name}
									href={link.href as any}
									className={`relative py-1 transition-colors hover:text-[#7EB338] ${
										isActive ? 'text-[#7EB338] font-semibold' : 'text-[#2D3748]'
									}`}
								>
									{link.name}
									{isActive && (
										<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7EB338] rounded-full" />
									)}
								</Link>
							)
						})}

						{/* Hot Deals Badge Link */}
						<Link
							href="/products"
							className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F08C38]/10 text-[#F08C38] hover:bg-[#F08C38] hover:text-white transition-all"
						>
							<Sparkles className="h-3 w-3" />
							Special Deals
						</Link>
					</nav>
				</div>

				{/* Right: Phone Support & Social Media Links */}
				<div className="flex items-center gap-6">
					{/* Support Phone */}
					<a
						href="tel:03393399393"
						className="flex items-center gap-2 text-xs text-[#718096] hover:text-[#7EB338] transition-colors"
					>
						<div className="p-1 rounded-full bg-[#7EB338]/10 text-[#7EB338]">
							<Phone className="h-3.5 w-3.5" />
						</div>
						<span>
							<strong className="text-[#2D3748]">24/7 Support:</strong> +92 339 3399393
						</span>
					</a>

					{/* Vertical Separator */}
					<div className="h-4 w-[1px] bg-[#E2E8F0]" />

					{/* Social Media Links */}
					<div className="flex items-center gap-3 text-[#718096]">
						<a
							href="https://facebook.com"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-[#7EB338] transition-colors p-1"
							aria-label="Facebook"
						>
							<FacebookIcon className="h-3.5 w-3.5" />
						</a>
						<a
							href="https://instagram.com"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-[#7EB338] transition-colors p-1"
							aria-label="Instagram"
						>
							<InstagramIcon className="h-3.5 w-3.5" />
						</a>
						<a
							href="https://wa.me/923393399393"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-[#7EB338] transition-colors p-1"
							aria-label="WhatsApp"
						>
							<WhatsAppIcon className="h-3.5 w-3.5" />
						</a>
						<a
							href="https://twitter.com"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-[#7EB338] transition-colors p-1"
							aria-label="Twitter"
						>
							<TwitterIcon className="h-3.5 w-3.5" />
						</a>
					</div>
				</div>
			</div>
		</div>
	)
}
