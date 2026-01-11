"use client"

import Link from 'next/link'
import { useState } from 'react'
import { Menu, MapPin } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import MiniCart from '@/app/components/cart/MiniCart'
import { X, User, ClipboardList, Monitor, Phone, HelpCircle, Carrot, Power, Settings } from 'lucide-react'

export default function MobileHeader() {
	const { data: session, status } = useSession()
	const [mobileOpen, setMobileOpen] = useState(false)
	const pathname = usePathname()
	const router = useRouter()

	return (
		<>
			{/* Mobile Header - Completely hidden on mobile, only show menu drawer functionality */}
			<header className="hidden">
				<div className="container-pg flex h-12 items-center justify-between gap-2">
					{/* Left: Menu + Logo */}
					<div className="flex items-center gap-2 min-w-0 flex-shrink-0">
						<button
							className="p-1.5 hover:bg-gray-100  transition-colors flex-shrink-0"
							aria-label="Menu"
							onClick={() => setMobileOpen(true)}
						>
							<Menu className="h-5 w-5 text-gray-900" strokeWidth={2} />
						</button>
						<Link href="/" className="flex items-center gap-2 min-w-0">
							<div className="relative h-7 w-7 flex-shrink-0">
								<Image src="/icon.png" alt="Chakki" width={28} height={28} className="object-contain" priority />
							</div>
							<span className="text-base font-semibold leading-tight truncate">Chakki</span>
						</Link>
					</div>

					{/* Right: Location + Cart */}
					<div className="flex items-center gap-2">
						<button
							onClick={() => router.push(`/change-location?redirect=${encodeURIComponent(pathname || '/')}`)}
							className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50  transition-colors"
						>
							<MapPin className="h-3.5 w-3.5" />
							<span className="truncate max-w-[60px]">Location</span>
						</button>
						<MiniCart variant="compact" iconColor="black" badgeColor="bg-brand-accent" />
					</div>
				</div>
			</header>

			{/* Mobile Menu Drawer */}
			<AnimatePresence>
				{mobileOpen && (
					<>
						<motion.div
							className="fixed inset-0 bg-black/50 z-40"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setMobileOpen(false)}
						/>
						<motion.div
							className="fixed left-0 top-0 bottom-0 z-50 bg-white w-72 max-w-[85vw] shadow-xl overflow-y-auto"
							initial={{ x: '-100%' }}
							animate={{ x: 0 }}
							exit={{ x: '-100%' }}
							transition={{ type: 'tween', duration: 0.25 }}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="p-4">
								<div className="flex items-center justify-between mb-6">
									<Link href="/" className="flex items-center gap-2">
										<div className="relative h-8 w-8">
											<Image src="/icon.png" alt="Chakki" width={32} height={32} className="object-contain" />
										</div>
										<span className="text-lg font-semibold">Chakki</span>
									</Link>
									<button
										aria-label="Close"
										className=" p-2 hover:bg-gray-100"
										onClick={() => setMobileOpen(false)}
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
										<Link href="/account" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileOpen(false)}>
											<User className="h-5 w-5" />
											<span className="font-semibold">My Profile</span>
										</Link>
									)}
									<Link href="/account" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileOpen(false)}>
										<ClipboardList className="h-5 w-5" />
										<span className="font-semibold">My Orders</span>
									</Link>
									<Link href="/products" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileOpen(false)}>
										<Monitor className="h-5 w-5" />
										<span className="font-semibold">Shop</span>
									</Link>
									<a href="tel:03393399393" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors">
										<Phone className="h-5 w-5" />
										<span className="font-semibold">Call Us</span>
									</a>
									<Link href="/help" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileOpen(false)}>
										<HelpCircle className="h-5 w-5" />
										<span className="font-semibold">FAQs</span>
									</Link>
									<Link href="/about" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileOpen(false)}>
										<Carrot className="h-5 w-5" />
										<span className="font-semibold">About Us</span>
									</Link>
									{status === 'authenticated' ? (
										<button
											className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors text-left"
											onClick={() => {
												setMobileOpen(false)
												signOut()
											}}
										>
											<Power className="h-5 w-5" />
											<span className="font-semibold">Sign Out</span>
										</button>
									) : (
										<Link href={`/auth/login?callbackUrl=${encodeURIComponent(pathname || '/')}`} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileOpen(false)}>
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

