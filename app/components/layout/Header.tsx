"use client"

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Menu, X, ChevronDown, ShoppingCart, List, Search, User, ClipboardList, Monitor, Phone, HelpCircle, Carrot, Power, Settings, MapPin } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useCartStore } from '@/store/cart'
import SearchBox from '@/app/components/search/SearchBox'
import MiniCart from '@/app/components/cart/MiniCart'

// Cities will be loaded from API

export default function Header() {
	const { data: session, status } = useSession()
	const [mounted, setMounted] = useState(false)
	const [mobileOpen, setMobileOpen] = useState(false)
	const [locationOpen, setLocationOpen] = useState(false)
	const [deliveryCity, setDeliveryCity] = useState('Lahore')
	const [deliveryAddress, setDeliveryAddress] = useState<string | null>(null)
	const [availableCities, setAvailableCities] = useState<string[]>([])
	const [isAdmin, setIsAdmin] = useState(false)
	const locationRef = useRef<HTMLDivElement>(null)
	const pathname = usePathname()
	const router = useRouter()
	const cartItems = useCartStore((state) => state.items)

	useEffect(() => { setMounted(true) }, [])
	useEffect(() => { setMobileOpen(false) }, [pathname])
	
	// Refresh location when pathname changes (e.g., returning from change-location page)
	useEffect(() => {
		async function refreshLocation() {
			if (status === 'authenticated' && session?.user?.email) {
				const userEmail = session.user.email
				// Add delay to let LocationSync save guest location first
				await new Promise(resolve => setTimeout(resolve, 500))
				
				try {
					const res = await fetch('/api/user-delivery-location', { cache: 'no-store' })
					const json = await res.json()
					if (json.success && json.data) {
						setDeliveryAddress(json.data.address)
						setDeliveryCity(json.data.city)
						// Update localStorage with user email
						localStorage.setItem('deliveryLocation', JSON.stringify({
							...json.data,
							userEmail: userEmail
						}))
					} else {
						// Check if there's a guest location that hasn't been saved yet
						const savedLocation = localStorage.getItem('deliveryLocation')
						if (savedLocation) {
							try {
								const location = JSON.parse(savedLocation)
								// If it's a guest location (no userEmail) or belongs to different user, keep it
								// LocationSync will save it to DB
								if (!location.userEmail || location.userEmail !== userEmail) {
									// Keep the guest location - LocationSync will handle saving it
									setDeliveryAddress(location.address)
									setDeliveryCity(location.city || '')
									return
								}
							} catch {}
						}
						// Only clear if no location exists at all
						localStorage.removeItem('deliveryLocation')
						localStorage.removeItem('deliveryCity')
						setDeliveryAddress(null)
						setDeliveryCity('')
					}
				} catch {
					// On error, check for guest location before clearing
					const savedLocation = localStorage.getItem('deliveryLocation')
					if (savedLocation) {
						try {
							const location = JSON.parse(savedLocation)
							if (!location.userEmail || location.userEmail !== session.user.email) {
								// Keep guest location
								setDeliveryAddress(location.address)
								setDeliveryCity(location.city || '')
								return
							}
						} catch {}
					}
					// Only clear if no valid guest location
					localStorage.removeItem('deliveryLocation')
					localStorage.removeItem('deliveryCity')
					setDeliveryAddress(null)
					setDeliveryCity('')
				}
			} else if (status === 'unauthenticated') {
				// Check localStorage for non-authenticated users (guest)
				const savedLocation = localStorage.getItem('deliveryLocation')
				if (savedLocation) {
					try {
						const location = JSON.parse(savedLocation)
						// Only use if it's a guest location (no userEmail)
						if (!location.userEmail) {
							setDeliveryAddress(location.address)
							setDeliveryCity(location.city || '')
						} else {
							// This was a logged-in user's location, clear it
							localStorage.removeItem('deliveryLocation')
							localStorage.removeItem('deliveryCity')
							setDeliveryAddress(null)
							setDeliveryCity('')
						}
					} catch {
						localStorage.removeItem('deliveryLocation')
						localStorage.removeItem('deliveryCity')
						setDeliveryAddress(null)
						setDeliveryCity('')
					}
				} else {
					setDeliveryAddress(null)
					setDeliveryCity('')
				}
			}
		}
		refreshLocation()
	}, [pathname, status, session?.user?.email])

	// Check admin status
	useEffect(() => {
		if (status === 'authenticated') {
			fetch('/api/account', { cache: 'no-store' })
				.then(res => res.json())
				.then(json => {
					if (json?.data?.isAdmin) setIsAdmin(true)
				})
				.catch(() => {})
		} else {
			setIsAdmin(false)
		}
	}, [status])

	// Load available cities from API (for backward compatibility)
	useEffect(() => {
		async function loadCities() {
			try {
				const res = await fetch('/api/delivery-areas?activeOnly=true', { cache: 'no-store' })
				const json = await res.json()
				if (json.success && Array.isArray(json.data)) {
					// Extract unique cities for backward compatibility
					const cities = [...new Set(json.data.map((area: any) => area.city).filter(Boolean))] as string[]
					setAvailableCities(cities)
					
					// Only load saved city from localStorage if user has a saved location
					const savedLocation = localStorage.getItem('deliveryLocation')
					const savedCity = localStorage.getItem('deliveryCity')
					if (savedLocation && savedCity && cities.includes(savedCity)) {
						setDeliveryCity(savedCity)
					}
					// Don't set default city for fresh users - they should select location
				}
			} catch (err) {
				console.error('Failed to load cities:', err)
				setAvailableCities([])
			}
		}
		loadCities()
	}, [])

	// Load user's saved delivery location
	useEffect(() => {
		if (status === 'authenticated' && session?.user?.email) {
			const userEmail = session.user.email
			
			// Add delay to let LocationSync save guest location first
			const timeout = setTimeout(async () => {
				// Clear any previous user's location from localStorage (only if different user)
				const prevUserLocation = localStorage.getItem('deliveryLocation')
				const prevUserCity = localStorage.getItem('deliveryCity')
				if (prevUserLocation || prevUserCity) {
					// Check if it belongs to a different user
					try {
						const location = prevUserLocation ? JSON.parse(prevUserLocation) : null
						if (location && location.userEmail && location.userEmail !== userEmail) {
							// Clear previous user's data
							localStorage.removeItem('deliveryLocation')
							localStorage.removeItem('deliveryCity')
						}
					} catch {}
				}
				
				// Load from database
				try {
					const res = await fetch('/api/user-delivery-location', { cache: 'no-store' })
					const json = await res.json()
					if (json.success && json.data) {
						setDeliveryAddress(json.data.address)
						setDeliveryCity(json.data.city)
						// Save to localStorage with user email for this session
						localStorage.setItem('deliveryLocation', JSON.stringify({
							...json.data,
							userEmail: userEmail
						}))
						localStorage.setItem('deliveryCity', json.data.city)
					} else {
						// No location in database - check for guest location before clearing
						const savedLocation = localStorage.getItem('deliveryLocation')
						if (savedLocation) {
							try {
								const location = JSON.parse(savedLocation)
								// If it's a guest location, keep it (LocationSync will save it)
								if (!location.userEmail || location.userEmail !== userEmail) {
									setDeliveryAddress(location.address)
									setDeliveryCity(location.city || '')
									return
								}
							} catch {}
						}
						// Only clear if no guest location exists
						localStorage.removeItem('deliveryLocation')
						localStorage.removeItem('deliveryCity')
						setDeliveryAddress(null)
						setDeliveryCity('')
					}
				} catch {
					// On error, check for guest location before clearing
					const savedLocation = localStorage.getItem('deliveryLocation')
					if (savedLocation) {
						try {
							const location = JSON.parse(savedLocation)
							if (!location.userEmail || location.userEmail !== userEmail) {
								setDeliveryAddress(location.address)
								setDeliveryCity(location.city || '')
								return
							}
						} catch {}
					}
					// Only clear if no valid guest location
					localStorage.removeItem('deliveryLocation')
					localStorage.removeItem('deliveryCity')
					setDeliveryAddress(null)
					setDeliveryCity('')
				}
			}, 400) // Wait for LocationSync to complete
			
			return () => clearTimeout(timeout)
		} else if (status === 'unauthenticated') {
			// For non-authenticated users, use guest location (no user email)
			const savedLocation = localStorage.getItem('deliveryLocation')
			if (savedLocation) {
				try {
					const location = JSON.parse(savedLocation)
					// Only use if it's a guest location (no userEmail) or matches current guest
					if (!location.userEmail) {
						setDeliveryAddress(location.address)
						setDeliveryCity(location.city || '')
					} else {
						// This was a logged-in user's location, clear it
						localStorage.removeItem('deliveryLocation')
						localStorage.removeItem('deliveryCity')
						setDeliveryAddress(null)
						setDeliveryCity('')
					}
				} catch {
					localStorage.removeItem('deliveryLocation')
					localStorage.removeItem('deliveryCity')
					setDeliveryAddress(null)
					setDeliveryCity('')
				}
			} else {
				setDeliveryAddress(null)
				setDeliveryCity('')
			}
		}
	}, [status, session?.user?.email])

	// Save delivery city to localStorage (only if user is authenticated or guest)
	useEffect(() => {
		if (deliveryCity && (status === 'authenticated' || status === 'unauthenticated')) {
			localStorage.setItem('deliveryCity', deliveryCity)
		}
	}, [deliveryCity, status])

	// Listen for storage changes (when location is updated in another tab/window)
	useEffect(() => {
		function handleStorageChange(e: StorageEvent) {
			if (e.key === 'deliveryLocation' && e.newValue) {
				try {
					const location = JSON.parse(e.newValue)
					// Only update if it's for the current user
					if (status === 'authenticated' && session?.user?.email) {
						if (location.userEmail === session.user.email) {
							setDeliveryAddress(location.address)
							setDeliveryCity(location.city || deliveryCity)
						}
					} else if (status === 'unauthenticated' && !location.userEmail) {
						// Guest user - only use if no userEmail
						setDeliveryAddress(location.address)
						setDeliveryCity(location.city || deliveryCity)
					}
				} catch {}
			} else if (e.key === 'deliveryCity' && e.newValue) {
				setDeliveryCity(e.newValue)
			}
		}
		window.addEventListener('storage', handleStorageChange)
		return () => window.removeEventListener('storage', handleStorageChange)
	}, [status, session?.user?.email])

	// Listen for custom event when location is updated (same tab/window)
	useEffect(() => {
		function handleLocationUpdate(e: CustomEvent) {
			const location = e.detail
			if (location) {
				// Only update if it's for the current user
				if (status === 'authenticated' && session?.user?.email) {
					if (!location.userEmail || location.userEmail === session.user.email) {
						setDeliveryAddress(location.address)
						setDeliveryCity(location.city || deliveryCity)
					}
				} else if (status === 'unauthenticated' && !location.userEmail) {
					// Guest user - only use if no userEmail
					setDeliveryAddress(location.address)
					setDeliveryCity(location.city || deliveryCity)
				}
			}
		}
		window.addEventListener('deliveryLocationUpdated', handleLocationUpdate as EventListener)
		return () => window.removeEventListener('deliveryLocationUpdated', handleLocationUpdate as EventListener)
	}, [status, session?.user?.email])

	// Refresh location when page becomes visible (in case it was updated in the same tab)
	useEffect(() => {
		function handleVisibilityChange() {
			if (document.visibilityState === 'visible') {
				// Reload location from API if authenticated
				if (status === 'authenticated') {
					fetch('/api/user-delivery-location', { cache: 'no-store' })
						.then(res => res.json())
						.then(json => {
							if (json.success && json.data) {
								setDeliveryAddress(json.data.address)
								setDeliveryCity(json.data.city)
							}
						})
						.catch(() => {})
				} else {
					// Check localStorage for non-authenticated users
					const savedLocation = localStorage.getItem('deliveryLocation')
					if (savedLocation) {
						try {
							const location = JSON.parse(savedLocation)
							setDeliveryAddress(location.address)
							setDeliveryCity(location.city || deliveryCity)
						} catch {}
					}
				}
			}
		}
		document.addEventListener('visibilitychange', handleVisibilityChange)
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
	}, [status])
	
	useEffect(() => {
		function onDown(e: MouseEvent) {
			if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
				setLocationOpen(false)
			}
		}
		function onEsc(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				setMobileOpen(false)
				setLocationOpen(false)
			}
		}
		document.addEventListener('mousedown', onDown)
		document.addEventListener('keydown', onEsc)
		return () => {
			document.removeEventListener('mousedown', onDown)
			document.removeEventListener('keydown', onEsc)
		}
	}, [])

	// Lock page scroll when mobile drawer is open
	useEffect(() => {
		const original = document.body.style.overflow
		document.body.style.overflow = mobileOpen ? 'hidden' : original || ''
		return () => { document.body.style.overflow = original }
	}, [mobileOpen])

	if (!mounted) {
		return (
			<header className="sticky top-0 z-40 bg-white border-b shadow-sm">
				<div className="container-pg flex h-14 items-center justify-between gap-4" />
			</header>
		)
	}

	return (
		<header className="sticky top-0 z-40 bg-white border-b shadow-sm hidden md:block">
			{/* Top Navigation Bar */}
			<div className="container-pg flex h-14 items-center justify-between gap-2 sm:gap-4">
				{/* Left: Hamburger Menu + Logo */}
				<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
					<button
						className="p-1.5 sm:p-2 hover:bg-gray-100  transition-colors flex-shrink-0"
						aria-label="Menu"
						onClick={() => setMobileOpen(true)}
					>
						<Menu className="h-5 w-5 text-gray-900" strokeWidth={2} />
					</button>
					<Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
						<div className="relative h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
							<Image src="/icon.png" alt="Chakki" width={40} height={40} className="object-contain" priority />
						</div>
						<div className="flex flex-col min-w-0">
							<span className="text-base sm:text-xl font-semibold leading-tight truncate">Chakki</span>
							<span className="text-[10px] sm:text-xs text-slate-600 truncate">by <a href="https://dervish.pk" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-accent transition-colors" onClick={(e) => e.stopPropagation()}>Digital Dervish</a></span>
						</div>
					</Link>
				</div>

				{/* Center: Delivery Location - Hidden on mobile, shown on tablet+ */}
				<div className="hidden md:flex flex-1 justify-center min-w-0">
					<div className="relative max-w-xs" ref={locationRef}>
						<button
							onClick={() => setLocationOpen(!locationOpen)}
							className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors w-full group"
							title={deliveryAddress ? `${deliveryAddress}${deliveryCity && !deliveryAddress.includes(deliveryCity) ? `, ${deliveryCity}` : ''}` : deliveryCity || 'Select your location'}
						>
							<span className="text-xs whitespace-nowrap hidden lg:inline">Delivering to</span>
							<span className="font-semibold text-gray-900 truncate text-xs sm:text-sm" title={deliveryAddress ? `${deliveryAddress}${deliveryCity && !deliveryAddress.includes(deliveryCity) ? `, ${deliveryCity}` : ''}` : deliveryCity || 'Select your location'}>
								{(() => {
									// Don't show coordinates - show area/society/city instead
									if (deliveryAddress && !deliveryAddress.startsWith('Location:') && !deliveryAddress.match(/^\d+\.\d+,\s*\d+\.\d+/)) {
										// Good address - show it
										return deliveryAddress
									} else if (deliveryCity) {
										// Show city if address is coordinates
										return deliveryCity
									} else {
										return 'Select location'
									}
								})()}
							</span>
							<ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 text-gray-700 transition-transform flex-shrink-0 ${locationOpen ? 'rotate-180' : ''}`} />
						</button>
						{locationOpen && (
							<div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border  shadow-lg min-w-[200px] z-50">
								<div className="py-2">
									<button
										onClick={() => {
											setLocationOpen(false)
											router.push(`/change-location?redirect=${encodeURIComponent(pathname)}`)
										}}
										className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors font-semibold text-brand-accent"
									>
										Select another location
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Right: Shopping Cart + Mobile Location Button */}
				<div className="flex items-center gap-2 sm:gap-3">
					{/* Mobile Location Button - Only on mobile */}
					<button
						onClick={() => router.push(`/change-location?redirect=${encodeURIComponent(pathname)}`)}
						className="md:hidden flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50  transition-colors"
						title={deliveryAddress ? `${deliveryAddress}${deliveryCity && !deliveryAddress.includes(deliveryCity) ? `, ${deliveryCity}` : ''}` : deliveryCity || 'Select your location'}
					>
						<MapPin className="h-4 w-4" />
						<span className="truncate max-w-[80px]">{deliveryCity || 'Location'}</span>
					</button>
					<div className="relative">
						<MiniCart variant="compact" iconColor="black" badgeColor="bg-brand-accent" />
					</div>
				</div>
			</div>

			{/* Search and Categories Section */}
			<div className="container-pg py-3 sm:py-4 border-t">
				<div className="flex items-center gap-2">
					{/* Categories Button */}
					<Link 
						href="/categories" 
						className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300  hover:bg-gray-50 transition-colors bg-white flex-shrink-0"
					>
						<List className="h-4 w-4 sm:h-5 sm:w-5 text-brand-accent" strokeWidth={2} />
						<span className="text-xs sm:text-sm font-medium text-gray-700 hidden xs:inline">Categories</span>
					</Link>
					
					{/* Search Input */}
					<div className="flex-1 flex items-center border-2 border-brand-accent  bg-white min-w-0 relative">
						<div className="flex-1 px-2 sm:px-4 min-w-0 relative z-10">
							<SearchBox />
						</div>
						<button 
							type="submit"
							form="search-form"
							className="px-3 sm:px-4 py-2 sm:py-2.5 bg-brand-accent hover:bg-orange-600 transition-colors flex-shrink-0 relative z-10"
						>
							<Search className="h-4 w-4 sm:h-5 sm:w-5 text-white" strokeWidth={2} />
						</button>
					</div>
				</div>
			</div>

			{/* Left Sidebar Drawer */}
			<AnimatePresence>
				{mobileOpen && (
					<>
						{/* Backdrop */}
						<motion.div
							className="fixed inset-0 bg-black/50 z-40"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setMobileOpen(false)}
						/>
						{/* Sidebar */}
					<motion.div
							className="fixed left-0 top-0 bottom-0 z-50 bg-white w-80 max-w-[85vw] shadow-xl overflow-y-auto"
							initial={{ x: '-100%' }}
						animate={{ x: 0 }}
							exit={{ x: '-100%' }}
						transition={{ type: 'tween', duration: 0.25 }}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="p-4">
								{/* Header */}
								<div className="flex items-center justify-between mb-6">
									<div className="flex items-center gap-3">
										<Link href="/" className="flex items-center gap-3">
											<div className="relative h-10 w-10">
												<Image src="/icon.png" alt="Chakki" width={40} height={40} className="object-contain" />
											</div>
											<div className="flex flex-col">
												<span className="text-lg font-semibold leading-tight">Chakki</span>
												<span className="text-xs text-slate-600">by <a href="https://dervish.pk" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-accent transition-colors" onClick={(e) => e.stopPropagation()}>Digital Dervish</a></span>
											</div>
										</Link>
									</div>
									<button
										aria-label="Close"
										className=" p-2 hover:bg-gray-100"
										onClick={() => setMobileOpen(false)}
									>
								<X className="h-5 w-5" />
							</button>
						</div>

								{/* User Greeting */}
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

								{/* Navigation Links */}
								<nav className="space-y-1">
									{status === 'authenticated' ? (
									<Link href="/account" prefetch={true} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileOpen(false)}>
										<User className="h-5 w-5" />
										<span className="font-semibold">My Profile</span>
									</Link>
									) : null}
									
									<Link href="/account" prefetch={true} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileOpen(false)}>
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
									
									<Link href="/about" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileOpen(false)} {...({} as any)}>
										<Carrot className="h-5 w-5" />
										<span className="font-semibold">About Us</span>
									</Link>
									
									{isAdmin && (
										<Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors" onClick={() => setMobileOpen(false)}>
											<Settings className="h-5 w-5" />
											<span className="font-semibold">Admin Panel</span>
										</Link>
									)}
									
									{status === 'authenticated' ? (
									<button
											className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50  transition-colors text-left"
											onClick={() => {
												setMobileOpen(false)
												// Clear user-specific location data before signing out
												localStorage.removeItem('deliveryLocation')
												localStorage.removeItem('deliveryCity')
												setDeliveryAddress(null)
												setDeliveryCity('')
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
		</header>
	)
}
