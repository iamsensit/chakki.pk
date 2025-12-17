"use client"

import { useEffect, useState, Suspense, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

function RouteLoaderInner() {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const [loading, setLoading] = useState(false)
	const previousPathname = useRef<string>(pathname)
	const previousSearchParams = useRef<string>(searchParams.toString())
	const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const loadingStartTime = useRef<number | null>(null)
	const minLoadingTime = 300 // Minimum time to show loader (ms)

	// Show loader immediately on link clicks and router navigation
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement
			const link = target.closest('a[href]')
			
			if (link) {
				const href = link.getAttribute('href')
				if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
					// Check if it's an external link
					try {
						const url = new URL(href, window.location.origin)
						if (url.origin === window.location.origin) {
							// Internal link - check if it's a different route
							const currentPath = window.location.pathname
							const currentSearch = window.location.search
							const newPath = url.pathname
							const newSearch = url.search
							
							// Only show loader if navigating to a different page
							if (newPath !== currentPath || newSearch !== currentSearch) {
								loadingStartTime.current = Date.now()
								setLoading(true)
							}
						}
					} catch {
						// Relative URL - check if it's a different route
						const currentPath = window.location.pathname
						const currentSearch = window.location.search
						
						// Parse relative URL
						const [pathPart, searchPart] = href.split('?')
						const newPath = pathPart || '/'
						const newSearch = searchPart ? `?${searchPart}` : ''
						
						// Only show loader if navigating to a different page
						if (newPath !== currentPath || newSearch !== currentSearch) {
							setLoading(true)
						}
					}
				}
			}
		}

		// Listen for clicks with capture to catch early
		document.addEventListener('click', handleClick, true)

		// Also listen for Next.js router events
		// Intercept router.push by listening to popstate and pushstate
		const handleRouteChange = () => {
			loadingStartTime.current = Date.now()
			setLoading(true)
		}

		// Listen for browser navigation events
		window.addEventListener('popstate', handleRouteChange)
		
		// Intercept pushState and replaceState
		const originalPushState = history.pushState
		const originalReplaceState = history.replaceState
		
		history.pushState = function(...args) {
			originalPushState.apply(history, args)
			// Only show loader for internal navigation to a different page
			if (args[2] && typeof args[2] === 'string') {
				try {
					const url = new URL(args[2], window.location.origin)
					if (url.origin === window.location.origin) {
						const currentPath = window.location.pathname
						const currentSearch = window.location.search
						const newPath = url.pathname
						const newSearch = url.search
						
						// Only show loader if navigating to a different page
						if (newPath !== currentPath || newSearch !== currentSearch) {
							loadingStartTime.current = Date.now()
							setLoading(true)
						}
					}
				} catch {
					// Relative URL - check if it's a different route
					const currentPath = window.location.pathname
					const currentSearch = window.location.search
					const [pathPart, searchPart] = args[2].split('?')
					const newPath = pathPart || '/'
					const newSearch = searchPart ? `?${searchPart}` : ''
					
					// Only show loader if navigating to a different page
					if (newPath !== currentPath || newSearch !== currentSearch) {
						loadingStartTime.current = Date.now()
						setLoading(true)
					}
				}
			}
		}
		
		history.replaceState = function(...args) {
			originalReplaceState.apply(history, args)
			// Only show loader for internal navigation to a different page
			if (args[2] && typeof args[2] === 'string') {
				try {
					const url = new URL(args[2], window.location.origin)
					if (url.origin === window.location.origin) {
						const currentPath = window.location.pathname
						const currentSearch = window.location.search
						const newPath = url.pathname
						const newSearch = url.search
						
						// Only show loader if navigating to a different page
						if (newPath !== currentPath || newSearch !== currentSearch) {
							loadingStartTime.current = Date.now()
							setLoading(true)
						}
					}
				} catch {
					// Relative URL - check if it's a different route
					const currentPath = window.location.pathname
					const currentSearch = window.location.search
					const [pathPart, searchPart] = args[2].split('?')
					const newPath = pathPart || '/'
					const newSearch = searchPart ? `?${searchPart}` : ''
					
					// Only show loader if navigating to a different page
					if (newPath !== currentPath || newSearch !== currentSearch) {
						loadingStartTime.current = Date.now()
						setLoading(true)
					}
				}
			}
		}

		return () => {
			document.removeEventListener('click', handleClick, true)
			window.removeEventListener('popstate', handleRouteChange)
			history.pushState = originalPushState
			history.replaceState = originalReplaceState
		}
	}, [])

	// Hide loader when route actually changes and page is loaded
	useEffect(() => {
		const currentPath = pathname
		const currentSearch = searchParams.toString()
		const pathChanged = previousPathname.current !== currentPath
		const searchChanged = previousSearchParams.current !== currentSearch

		if (loading) {
			if (pathChanged || searchChanged) {
				// Route has changed, wait for page to render
				previousPathname.current = currentPath
				previousSearchParams.current = currentSearch

				// Clear any existing timeout
				if (navigationTimeoutRef.current) {
					clearTimeout(navigationTimeoutRef.current)
				}

				// Calculate how long we've been loading
				const elapsed = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0
				const remainingTime = Math.max(0, minLoadingTime - elapsed)

				// Wait for DOM to update and page to be ready
				// Use requestAnimationFrame to ensure DOM has updated, then wait a bit more
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						// Wait for minimum loading time + small delay for smooth transition
						navigationTimeoutRef.current = setTimeout(() => {
							setLoading(false)
							loadingStartTime.current = null
						}, remainingTime + 150)
					})
				})
			} else {
				// Route didn't change - hide loader (same page navigation)
				if (navigationTimeoutRef.current) {
					clearTimeout(navigationTimeoutRef.current)
				}
				// Hide after a short delay to prevent flicker
				navigationTimeoutRef.current = setTimeout(() => {
					setLoading(false)
					loadingStartTime.current = null
				}, 100)
			}
		}

		return () => {
			if (navigationTimeoutRef.current) {
				clearTimeout(navigationTimeoutRef.current)
			}
		}
	}, [pathname, searchParams, loading])

	// Initialize refs on mount
	useEffect(() => {
		previousPathname.current = pathname
		previousSearchParams.current = searchParams.toString()
	}, [])

	return (
		<AnimatePresence>
			{loading && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
				>
					<div className="flex flex-col items-center gap-4">
						<div className="relative w-16 h-16">
							<motion.div
								className="absolute inset-0 border-4 border-brand-accent border-t-transparent rounded-full"
								animate={{ rotate: 360 }}
								transition={{
									duration: 1,
									repeat: Infinity,
									ease: 'linear'
								}}
							/>
							<motion.div
								className="absolute inset-2 border-4 border-brand border-t-transparent rounded-full"
								animate={{ rotate: -360 }}
								transition={{
									duration: 1.5,
									repeat: Infinity,
									ease: 'linear'
								}}
							/>
						</div>
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="text-sm text-slate-600 font-medium"
						>
							Loading...
						</motion.p>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

export default function RouteLoader() {
	const [mounted, setMounted] = useState(false)
	
	useEffect(() => {
		setMounted(true)
	}, [])
	
	if (!mounted) {
		return null
	}
	
	return (
		<Suspense fallback={null}>
			<RouteLoaderInner />
		</Suspense>
	)
}

