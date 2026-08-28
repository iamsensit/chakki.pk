"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
	Home,
	Grid,
	Search,
	ShoppingCart,
	User,
	Menu,
	X,
	ClipboardList,
	Phone,
	HelpCircle,
	Power,
	MapPin,
	Settings,
	Heart,
	Layers
} from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function MobileBottomNav() {
	const pathname = usePathname()
	const router = useRouter()
	const cartItems = useCartStore((state) => state.items)
	const wishlistItems = useWishlistStore((state) => state.items)
	const { data: session, status } = useSession()
	const isAuthenticated = status === 'authenticated'
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [isAdmin, setIsAdmin] = useState(false)

	useEffect(() => {
		if (status === 'authenticated') {
			fetch('/api/account', { cache: 'no-store' })
				.then(res => res.json())
				.then(json => {
					if (json?.data?.isAdmin) setIsAdmin(true)
				})
				.catch(() => setIsAdmin(false))
		} else {
			setIsAdmin(false)
		}
	}, [status])

	// Close drawer on navigation
	useEffect(() => {
		setMobileMenuOpen(false)
	}, [pathname])
	
	// Don't show on auth pages
	if (pathname?.startsWith('/auth')) {
		return null
	}
	
	const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)
	
	const navItems = [
		{ href: '/' as const, icon: Home, label: 'Home' },
		{ href: '/categories' as const, icon: Layers, label: 'Categories' },
		{ href: '/products' as const, icon: Search, label: 'Search' },
		{ href: '/cart' as const, icon: ShoppingCart, label: 'Cart', badge: totalItemsCount },
		{ href: (isAuthenticated ? '/account' : `/auth/login?callbackUrl=${encodeURIComponent(pathname || '/')}`) as string, icon: User, label: 'Account' },
	]
	
	return (
		<>
			<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] shadow-lg md:hidden">
				<div className="flex items-center justify-around h-14 relative px-1">
					{navItems.map((item) => {
						const Icon = item.icon
						const href = item.href as any
						const isActive = pathname === item.href || 
							(item.href === '/account' && pathname?.startsWith('/account')) ||
							(item.href === '/categories' && pathname?.startsWith('/categories')) ||
							(item.href === '/products' && pathname?.startsWith('/products'))
						
						return (
							<Link
								key={item.label}
								href={href}
								className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all ${
									isActive ? 'text-[#7EB338]' : 'text-[#718096] hover:text-[#2D3748]'
								}`}
							>
								<div className="relative">
									<Icon 
										className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} 
										strokeWidth={isActive ? 2.5 : 2}
									/>
									{item.badge !== undefined && item.badge > 0 && (
										<span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-[#F08C38] text-white text-[9px] font-extrabold flex items-center justify-center border-2 border-white shadow-xs">
											{item.badge > 99 ? '99+' : item.badge}
										</span>
									)}
								</div>
								<span className={`text-[10px] font-bold tracking-tight ${isActive ? 'text-[#7EB338]' : 'text-[#718096]'}`}>
									{item.label}
								</span>
							</Link>
						)
					})}

					{/* Menu Button */}
					<button
						onClick={() => setMobileMenuOpen(true)}
						className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all ${
							mobileMenuOpen ? 'text-[#7EB338]' : 'text-[#718096] hover:text-[#2D3748]'
						}`}
						aria-label="Open mobile menu"
					>
						<Menu className="h-5 w-5" strokeWidth={2} />
						<span className="text-[10px] font-bold tracking-tight text-[#718096]">More</span>
					</button>
				</div>
			</nav>

			{/* Mobile Menu Drawer */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<>
						<motion.div
							className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60]"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setMobileMenuOpen(false)}
						/>
						<motion.div
							className="fixed left-0 top-0 bottom-0 z-[70] bg-white w-80 max-w-[85vw] shadow-2xl flex flex-col justify-between"
							initial={{ x: '-100%' }}
							animate={{ x: 0 }}
							exit={{ x: '-100%' }}
							transition={{ type: 'tween', duration: 0.25 }}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="overflow-y-auto p-5">
								{/* Header */}
								<div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-4">
									<div className="flex items-center gap-2.5">
										<div className="h-9 w-9 rounded-full bg-[#F5EFE0] p-1 flex items-center justify-center border border-[#E2E8F0]">
											<img src="/icon.png" alt="Chakki" className="h-6 w-6 object-contain" />
										</div>
										<span className="font-black text-lg text-[#2D3748]">CHAKKI</span>
									</div>
									<button
										onClick={() => setMobileMenuOpen(false)}
										className="p-1.5 rounded-full text-[#718096] hover:text-[#2D3748] hover:bg-slate-100"
									>
										<X className="h-5 w-5" />
									</button>
								</div>

								{/* Navigation Links */}
								<div className="space-y-1">
									<Link
										href="/"
										className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]"
									>
										<Home className="h-4 w-4 text-[#7EB338]" />
										<span>Home</span>
									</Link>
									<Link
										href="/products"
										className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]"
									>
										<Search className="h-4 w-4 text-[#7EB338]" />
										<span>All Products</span>
									</Link>
									<Link
										href="/categories"
										className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]"
									>
										<Layers className="h-4 w-4 text-[#7EB338]" />
										<span>Categories</span>
									</Link>
									<Link
										href={"/products?onSale=true" as any}
										className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#F08C38]"
									>
										<div className="flex items-center gap-3">
											<span className="h-4 w-4 flex items-center justify-center text-sm">🔥</span>
											<span>Special Offers & Deals</span>
										</div>
										<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F08C38]/15 text-[#F08C38]">
											HOT
										</span>
									</Link>
									<Link
										href="/account"
										className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]"
									>
										<Heart className="h-4 w-4 text-[#F08C38]" />
										<span>Wishlist</span>
									</Link>
									<Link
										href="/orders"
										className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]"
									>
										<ClipboardList className="h-4 w-4 text-[#7EB338]" />
										<span>Track Orders</span>
									</Link>
									<Link
										href="/contact"
										className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]"
									>
										<Phone className="h-4 w-4 text-[#7EB338]" />
										<span>Contact & Support</span>
									</Link>
									<Link
										href="/help"
										className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338]"
									>
										<HelpCircle className="h-4 w-4 text-[#7EB338]" />
										<span>FAQs & Help</span>
									</Link>

									{isAdmin && (
										<Link
											href="/admin"
											className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#F08C38] bg-orange-50 hover:bg-orange-100 mt-2"
										>
											<Settings className="h-4 w-4 text-[#F08C38]" />
											<span>Admin Panel</span>
										</Link>
									)}
								</div>
							</div>

							{/* Bottom Auth Section */}
							<div className="p-4 border-t border-[#E2E8F0] bg-slate-50">
								{isAuthenticated ? (
									<button
										onClick={() => signOut()}
										className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
									>
										<Power className="h-4 w-4" />
										<span>Sign Out</span>
									</button>
								) : (
									<Link
										href={`/auth/login?callbackUrl=${encodeURIComponent(pathname || '/')}` as any}
										className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-[#7EB338] hover:bg-[#6fa02f] transition-colors shadow-sm"
									>
										<User className="h-4 w-4" />
										<span>Sign In / Register</span>
									</Link>
								)}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	)
}
