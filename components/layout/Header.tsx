"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import {
	Search,
	ShoppingCart,
	User,
	Heart,
	MapPin,
	Phone,
	ChevronDown,
	X,
	ClipboardList,
	Settings,
	Power,
	Sparkles,
	Layers
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCartStore, cartTotal } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import CartDrawer from '@/app/components/cart/CartDrawer'
import SubNav from './SubNav'

const INITIAL_CATEGORIES = [{ label: 'All Categories', value: '' }]

export default function Header() {
	const { data: session, status } = useSession()
	const [userMenuOpen, setUserMenuOpen] = useState(false)
	const [locationOpen, setLocationOpen] = useState(false)
	const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
	
	const [categoriesList, setCategoriesList] = useState(INITIAL_CATEGORIES)
	const [selectedCategory, setSelectedCategory] = useState('')
	const [searchQuery, setSearchQuery] = useState('')
	const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
	const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false)
	const [searchHighlightIndex, setSearchHighlightIndex] = useState(0)

	const [deliveryCity, setDeliveryCity] = useState('')
	const [deliveryAddress, setDeliveryAddress] = useState<string | null>(null)
	const [isAdmin, setIsAdmin] = useState(false)
	const [isMounted, setIsMounted] = useState(false)

	const locationRef = useRef<HTMLDivElement>(null)
	const userMenuRef = useRef<HTMLDivElement>(null)
	const searchRef = useRef<HTMLDivElement>(null)

	// Fetch dynamic categories for search dropdown
	useEffect(() => {
		fetch('/api/categories?includeProductDerived=1')
			.then((res) => res.json())
			.then((json) => {
				if (json?.success && Array.isArray(json?.data?.categories) && json.data.categories.length > 0) {
					const mapped = json.data.categories.map((c: any) => ({
						label: String(c.name),
						value: String(c.slug || c.name)
					}))
					setCategoriesList([{ label: 'All Categories', value: '' }, ...mapped])
				}
			})
			.catch(() => {})
	}, [])

	const pathname = usePathname()
	const router = useRouter()

	const cartItems = useCartStore((state) => state.items)
	const wishlistItems = useWishlistStore((state) => state.items)

	const totalAmount = cartTotal(cartItems)
	const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)

	useEffect(() => {
		setIsMounted(true)
		setUserMenuOpen(false)
		setSearchSuggestionsOpen(false)
	}, [pathname])

	// Check admin status
	useEffect(() => {
		if (status === 'authenticated') {
			fetch('/api/account', { cache: 'no-store' })
				.then((res) => res.json())
				.then((json) => {
					if (json?.data?.isAdmin) setIsAdmin(true)
				})
				.catch(() => setIsAdmin(false))
		} else {
			setIsAdmin(false)
		}
	}, [status])

	// Read location
	useEffect(() => {
		try {
			const saved = localStorage.getItem('user_delivery_location')
			if (saved) {
				const parsed = JSON.parse(saved)
				if (parsed?.city) setDeliveryCity(parsed.city)
				if (parsed?.address) setDeliveryAddress(parsed.address)
			}
		} catch {}
	}, [])

	// Debounced Live Search Suggestions
	useEffect(() => {
		if (!searchQuery.trim()) {
			setSearchSuggestions([])
			setSearchSuggestionsOpen(false)
			return
		}

		const timeoutId = setTimeout(async () => {
			try {
				const params = new URLSearchParams()
				params.set('suggest', '1')
				params.set('q', searchQuery.trim())
				if (selectedCategory) params.set('category', selectedCategory)

				const res = await fetch(`/api/products?${params.toString()}`)
				const json = await res.json()
				if (json?.success && Array.isArray(json?.data?.items)) {
					setSearchSuggestions(json.data.items)
					setSearchSuggestionsOpen(true)
				} else {
					setSearchSuggestions([])
				}
			} catch {
				setSearchSuggestions([])
			}
		}, 200)

		return () => clearTimeout(timeoutId)
	}, [searchQuery, selectedCategory])

	// Close dropdowns on outside click
	useEffect(() => {
		function onMouseDown(e: MouseEvent) {
			if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
				setLocationOpen(false)
			}
			if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
				setUserMenuOpen(false)
			}
			if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
				setSearchSuggestionsOpen(false)
			}
		}

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				setLocationOpen(false)
				setUserMenuOpen(false)
				setSearchSuggestionsOpen(false)
			}
		}

		document.addEventListener('mousedown', onMouseDown)
		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('mousedown', onMouseDown)
			document.removeEventListener('keydown', onKeyDown)
		}
	}, [])

	function handleSearchSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (searchQuery.trim()) {
			const params = new URLSearchParams()
			params.set('q', searchQuery.trim())
			if (selectedCategory) params.set('category', selectedCategory)
			router.push(`/products?${params.toString()}` as any)
			setSearchSuggestionsOpen(false)
		}
	}

	return (
		<>
			<header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-xs">
				{/* Top Header Bar */}
				<div className="container-pg flex items-center justify-between gap-4 py-2.5 sm:py-3">
					{/* Logo & Brand Identity */}
					<Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
						<div className="relative h-10 w-10 rounded-full bg-[#F5EFE0] p-1 flex items-center justify-center border border-[#E2E8F0] shadow-xs group-hover:border-[#7EB338] transition-colors">
							<Image
								src="/icon.png"
								alt="Chakki Wholesale Store"
								width={32}
								height={32}
								className="object-contain"
								priority
							/>
						</div>
						<div className="flex flex-col">
							<div className="flex items-center gap-1.5 leading-none">
								<span className="text-xl font-black tracking-tight text-[#2D3748] group-hover:text-[#7EB338] transition-colors">
									CHAKKI
								</span>
								<span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-[#7EB338] text-white">
									FRESH
								</span>
							</div>
							<span className="text-[10px] font-semibold text-[#718096] tracking-wide mt-0.5">
								Wholesale Atta & Groceries
							</span>
						</div>
					</Link>

					{/* Center: Desktop Search Bar (Rounded Pill with Category Selector) */}
					<div className="flex-1 max-w-2xl hidden md:block" ref={searchRef}>
						<form
							onSubmit={handleSearchSubmit}
							className="relative flex items-center rounded-full border border-[#E2E8F0] bg-slate-50/70 shadow-xs focus-within:bg-white focus-within:border-[#7EB338] focus-within:ring-2 focus-within:ring-[#7EB338]/15 transition-all overflow-hidden"
						>
							{/* Category Select Dropdown */}
							<div className="relative border-r border-[#E2E8F0] bg-transparent flex items-center">
								<select
									value={selectedCategory}
									onChange={(e) => setSelectedCategory(e.target.value)}
									className="appearance-none bg-transparent pl-4 pr-7 py-2 text-xs font-bold text-[#2D3748] cursor-pointer outline-none border-0 focus:ring-0 max-w-[140px] truncate"
								>
									{categoriesList.map((cat) => (
										<option key={cat.value} value={cat.value}>
											{cat.label}
										</option>
									))}
								</select>
								<ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-[#718096] pointer-events-none" />
							</div>

							{/* Search Input */}
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onFocus={() => {
									if (searchQuery.trim() && searchSuggestions.length > 0) {
										setSearchSuggestionsOpen(true)
									}
								}}
								placeholder="Search whole wheat atta, rice, pulses, spices, edible oils..."
								className="flex-1 bg-transparent px-3.5 py-2 text-xs text-[#2D3748] placeholder-[#718096] focus:outline-none min-w-0"
								autoComplete="off"
							/>

							{/* Clear Button */}
							{searchQuery.trim() && (
								<button
									type="button"
									onClick={() => {
										setSearchQuery('')
										setSearchSuggestions([])
										setSearchSuggestionsOpen(false)
									}}
									className="p-1 text-[#718096] hover:text-[#2D3748] transition-colors"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							)}

							{/* Search Submit Pill Button */}
							<button
								type="submit"
								className="m-1 h-8 px-4 rounded-full bg-[#7EB338] hover:bg-[#6fa02f] text-white flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-xs active:scale-95 flex-shrink-0"
								aria-label="Search"
							>
								<Search className="h-3.5 w-3.5 stroke-[2.5]" />
								<span>Search</span>
							</button>
						</form>

						{/* Autocomplete Dropdown */}
						{searchSuggestionsOpen && searchQuery.trim() && (
							<div className="relative">
								<div className="absolute top-2 left-0 right-0 z-50 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-h-96 overflow-y-auto divide-y divide-[#E2E8F0]">
									{searchSuggestions.length > 0 ? (
										searchSuggestions.map((item) => (
											<div
												key={item._id || item.id}
												onClick={() => {
													router.push(`/products/${item.slug || item._id || item.id}` as any)
													setSearchSuggestionsOpen(false)
													setSearchQuery('')
												}}
												className="flex items-center gap-3 p-3 hover:bg-[#F5EFE0] cursor-pointer transition-colors"
											>
												<div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
													{item.images?.[0] ? (
														<img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
													) : (
														<Layers className="h-5 w-5 text-[#718096]" />
													)}
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-xs font-bold text-[#2D3748] truncate">{item.title}</p>
													<p className="text-[10px] text-[#718096] truncate">
														{item.category || 'Wholesale Grocery'}
													</p>
												</div>
											</div>
										))
									) : (
										<div className="p-4 text-center text-xs text-[#718096]">
											No products matching &quot;{searchQuery}&quot;
										</div>
									)}
								</div>
							</div>
						)}
					</div>

					{/* Right: Actions */}
					<div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
						{/* Location Selector (Desktop only) */}
						<div className="relative hidden xl:block" ref={locationRef}>
							<button
								onClick={() => setLocationOpen(!locationOpen)}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:border-[#7EB338] text-xs font-bold text-[#2D3748] transition-colors"
							>
								<MapPin className="h-3.5 w-3.5 text-[#7EB338]" />
								<span className="truncate max-w-[100px]">{deliveryCity || 'Select City'}</span>
								<ChevronDown className="h-3 w-3 text-[#718096]" />
							</button>

							{locationOpen && (
								<div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl border border-[#E2E8F0] shadow-lg p-2 z-50">
									<p className="text-xs font-semibold text-[#718096] px-2 py-1">
										Delivering to: {deliveryAddress || deliveryCity || 'Pakistan'}
									</p>
									<button
										onClick={() => {
											setLocationOpen(false)
											router.push(`/change-location?redirect=${encodeURIComponent(pathname)}` as any)
										}}
										className="w-full mt-1 text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-[#7EB338] hover:bg-[#F5EFE0] transition-colors"
									>
										Change Delivery Location
									</button>
								</div>
							)}
						</div>

						{/* Mobile Location Badge (Mobile only) */}
						<div className="md:hidden">
							<Link
								href={`/change-location?redirect=${encodeURIComponent(pathname)}` as any}
								className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-[#E2E8F0] text-[11px] font-bold text-[#2D3748]"
							>
								<MapPin className="h-3 w-3 text-[#7EB338]" />
								<span className="truncate max-w-[80px]">{deliveryCity || 'Lahore'}</span>
							</Link>
						</div>

						{/* User Account / Auth (Desktop only) */}
						<div className="relative hidden md:block" ref={userMenuRef}>
							{status === 'authenticated' ? (
								<div>
									<button
										onClick={() => setUserMenuOpen(!userMenuOpen)}
										className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#F5EFE0] transition-colors"
									>
										<div className="h-8 w-8 rounded-full bg-[#7EB338]/10 text-[#7EB338] flex items-center justify-center font-bold text-xs">
											{session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
										</div>
										<div className="hidden lg:flex flex-col text-left">
											<span className="text-xs font-bold text-[#2D3748] truncate max-w-[90px]">
												{session?.user?.name || 'My Account'}
											</span>
											<span className="text-[10px] text-[#718096]">Orders & Profile</span>
										</div>
										<ChevronDown className="h-3 w-3 text-[#718096] hidden lg:block" />
									</button>

									{userMenuOpen && (
										<div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-[#E2E8F0] shadow-xl p-1 z-50 divide-y divide-[#E2E8F0]">
											<div className="px-3 py-2">
												<p className="text-xs font-bold text-[#2D3748] truncate">
													{session?.user?.name || 'User'}
												</p>
												<p className="text-[10px] text-[#718096] truncate">
													{session?.user?.email}
												</p>
											</div>
											<div className="py-1">
												<Link
													href="/account"
													className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338] rounded-lg transition-colors"
												>
													<User className="h-3.5 w-3.5" />
													My Profile
												</Link>
												<Link
													href="/orders"
													className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#7EB338] rounded-lg transition-colors"
												>
													<ClipboardList className="h-3.5 w-3.5" />
													My Orders
												</Link>
												{isAdmin && (
													<Link
														href="/admin"
														className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#F08C38] hover:bg-orange-50 rounded-lg transition-colors"
													>
														<Settings className="h-3.5 w-3.5" />
														Admin Panel
													</Link>
												)}
											</div>
											<div className="pt-1">
												<button
													onClick={() => {
														setUserMenuOpen(false)
														signOut()
													}}
													className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
												>
													<Power className="h-3.5 w-3.5" />
													Sign Out
												</button>
											</div>
										</div>
									)}
								</div>
							) : (
								<Link
									href={`/auth/login?callbackUrl=${encodeURIComponent(pathname || '/')}` as any}
									className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#F5EFE0] text-[#2D3748] hover:text-[#7EB338] transition-colors"
								>
									<div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
										<User className="h-4 w-4 text-[#718096]" />
									</div>
									<div className="hidden lg:flex flex-col text-left">
										<span className="text-xs font-bold text-[#2D3748]">Sign In</span>
										<span className="text-[10px] text-[#718096]">Account</span>
									</div>
								</Link>
							)}
						</div>

						{/* Wishlist Button (Desktop only) */}
						<Link
							href="/account"
							className="relative p-2 rounded-xl text-[#2D3748] hover:bg-[#F5EFE0] hover:text-[#F08C38] transition-colors hidden md:block"
							title="Wishlist"
						>
							<Heart className="h-5 w-5" />
							{isMounted && wishlistItems.length > 0 && (
								<span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-[#F08C38] text-white text-[10px] font-bold flex items-center justify-center">
									{wishlistItems.length}
								</span>
							)}
						</Link>

						{/* Cart Pill (Desktop only) */}
						<button
							onClick={() => setCartDrawerOpen(true)}
							className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#7EB338] hover:bg-[#6fa02f] text-white font-bold text-xs shadow-sm transition-all active:scale-95"
							aria-label="Open Shopping Cart"
						>
							<div className="relative">
								<ShoppingCart className="h-4 w-4" />
								{isMounted && totalItemsCount > 0 && (
									<span className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-[#F08C38] text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white">
										{totalItemsCount}
									</span>
								)}
							</div>
							<span className="border-l border-white/30 pl-2">
								Rs. {isMounted ? totalAmount.toLocaleString() : '0'}
							</span>
						</button>
					</div>
				</div>

				{/* Secondary SubNav (Desktop Only) */}
				<SubNav />
			</header>

			{/* Cart Drawer */}
			<CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
		</>
	)
}
