"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Search, ShoppingCart, User, Menu, X, ClipboardList, Monitor, Phone, HelpCircle, Carrot, Power, MapPin, Settings } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function MobileBottomNav() {
	const pathname = usePathname()
	const router = useRouter()
	const cartItems = useCartStore((state) => state.items)
	const { data: session, status } = useSession()
	const isAuthenticated = status === 'authenticated'
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [isAdmin, setIsAdmin] = useState(false)

	// Check admin status (non-blocking, deferred)
	useEffect(() => {
		if (status === 'authenticated') {
			// Defer to avoid blocking initial render
			const timeoutId = setTimeout(() => {
			fetch('/api/account', { cache: 'no-store' })
				.then(res => res.json())
				.then(json => {
					if (json?.data?.isAdmin) setIsAdmin(true)
				})
				.catch(() => setIsAdmin(false))
			}, 50)
			return () => clearTimeout(timeoutId)
		} else {
			setIsAdmin(false)
		}
	}, [status])
	
	// Don't show on auth pages (but allow on admin pages)
	if (pathname?.startsWith('/auth')) {
		return null
	}
	
	const cartCount = cartItems.length > 0 ? cartItems.length : undefined
	
	const navItems = [
		{ href: '/' as const, icon: Home, label: 'Home' },
		{ href: '/products' as const, icon: Search, label: 'Search' },
		{ href: '/cart' as const, icon: ShoppingCart, label: 'Cart', badge: cartCount },
		{ href: (isAuthenticated ? '/account' : `/auth/login?callbackUrl=${encodeURIComponent(pathname || '/')}`) as string, icon: User, label: 'Account' },
	]
	
	return (
		<>
			<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden">
				<div className="flex items-center justify-around h-14 relative">
					{navItems.map((item) => {
						const Icon = item.icon
						const href = item.href as any
						const isActive = pathname === item.href || 
							(item.href === '/account' && pathname?.startsWith('/account')) ||
							(item.href === '/products' && pathname?.startsWith('/products'))
						
						return (
							<Link
								key={item.href}
								href={href}
								className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
							>
								<div className="relative">
									<Icon 
										className={`h-5 w-5 transition-colors ${isActive ? 'text-brand-accent' : 'text-gray-600'}`} 
										strokeWidth={isActive ? 2.5 : 2}
									/>
									{item.badge !== undefined && item.badge > 0 && (
										<motion.span
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand-accent text-white text-[10px] font-bold flex items-center justify-center min-w-[16px]"
										>
											{item.badge > 9 ? '9+' : item.badge}
										</motion.span>
									)}
								</div>
								<span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-brand-accent' : 'text-gray-600'}`}>
									{item.label}
								</span>
							</Link>
						)
					})}
					{/* Menu Button - Opens drawer */}
					<button
						onClick={() => setMobileMenuOpen(true)}
						className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
					>
						<Menu className="h-5 w-5 text-gray-600 transition-colors" strokeWidth={2} />
						<span className="text-[10px] font-semibold text-gray-600">Menu</span>
					</button>
				</div>
			</nav>

			{/* Mobile Menu Drawer */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<>
						<motion.div
							className="fixed inset-0 bg-black/50 z-[60]"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setMobileMenuOpen(false)}
						/>
						<motion.div
							className="fixed left-0 top-0 bottom-0 z-[70] bg-white w-72 max-w-[85vw] shadow-xl overflow-y-auto"
							initial={{ x: '-100%' }}
							animate={{ x: 0 }}
							exit={{ x: '-100%' }}
							transition={{ type: 'tween', duration: 0.25 }}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="p-4">
								<div className="flex items-center justify-between mb-6">
									<Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
										<div className="relative h-8 w-8">
											<Image src="/icon.png" alt="Chakki" width={32} height={32} className="object-contain" />
										</div>
										<span className="text-lg font-semibold">Chakki</span>
									</Link>
									<button
										aria-label="Close"
										className=" p-2 hover:bg-gray-100"
										onClick={() => setMobileMenuOpen(false)}
									>
										<X className="h-5 w-5" />
									</button>
								</div>

								<div className="mb-6 pb-4 border-b">
									{status === 'authenticated' ? (
										<div className="text-sm text-gray-700">
											Salam, <span className="font-semibold">{session?.user?.name || session?.user?.email || 'User'}!</span>
										</div>
									) : (
										<div className="text-sm text-gray-700">
											Salam, <span className="font-semibold">Guest User!</span>
										</div>
									)}
								</div>

								<nav className="space-y-1">
									{status === 'authenticated' && (
										<Link href="/account" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileMenuOpen(false)}>
											<User className="h-5 w-5" />
											<span className="font-semibold">My Profile</span>
										</Link>
									)}
									{isAdmin && (
										<Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileMenuOpen(false)}>
											<Settings className="h-5 w-5" />
											<span className="font-semibold">Admin Panel</span>
										</Link>
									)}
									<Link href="/account" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileMenuOpen(false)}>
										<ClipboardList className="h-5 w-5" />
										<span className="font-semibold">My Orders</span>
									</Link>
									<Link href="/products" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileMenuOpen(false)}>
										<Monitor className="h-5 w-5" />
										<span className="font-semibold">Shop</span>
									</Link>
									<button
										onClick={() => {
											setMobileMenuOpen(false)
											router.push(`/change-location?redirect=${encodeURIComponent(pathname || '/')}`)
										}}
										className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors text-left"
									>
										<MapPin className="h-5 w-5" />
										<span className="font-semibold">Change Location</span>
									</button>
									<a href="tel:03393399393" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors">
										<Phone className="h-5 w-5" />
										<span className="font-semibold">Call Us</span>
									</a>
									<Link href="/help" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileMenuOpen(false)}>
										<HelpCircle className="h-5 w-5" />
										<span className="font-semibold">FAQs</span>
									</Link>
									<Link href="/about" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileMenuOpen(false)}>
										<Carrot className="h-5 w-5" />
										<span className="font-semibold">About Us</span>
									</Link>
									{status === 'authenticated' ? (
										<button
											className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors text-left"
											onClick={() => {
												setMobileMenuOpen(false)
												signOut()
											}}
										>
											<Power className="h-5 w-5" />
											<span className="font-semibold">Sign Out</span>
										</button>
									) : (
										<Link href={`/auth/login?callbackUrl=${encodeURIComponent(pathname || '/')}`} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileMenuOpen(false)}>
											<Power className="h-5 w-5" />
											<span className="font-semibold">Sign In</span>
										</Link>
									)}
								</nav>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	)
}

