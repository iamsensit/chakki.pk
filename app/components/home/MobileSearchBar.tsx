"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

const placeholders = [
	'Search hot selling products 🔥',
	'Search fresh products 🥬',
	'Search best deals 💰',
	'Search products...',
]

export default function MobileSearchBar() {
	const [q, setQ] = useState('')
	const [open, setOpen] = useState(false)
	const [items, setItems] = useState<any[]>([])
	const [highlight, setHighlight] = useState(0)
	const [currentPlaceholder, setCurrentPlaceholder] = useState(0)
	const ref = useRef<HTMLDivElement>(null)
	const router = useRouter()

	// Rotate placeholders
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
		}, 3000) // Change every 3 seconds
		return () => clearInterval(interval)
	}, [])

	useEffect(() => {
		const t = setTimeout(async () => {
			if (!q.trim()) { 
				setItems([])
				setOpen(false)
				return 
			}
			try {
				const res = await fetch(`/api/products?suggest=1&q=${encodeURIComponent(q)}&limit=10`)
				const json = await res.json()
				
				if (!res.ok || !json?.success) {
					setItems([])
					setOpen(true)
					return
				}
				const items = json?.data?.items || []
				setItems(items)
				setOpen(true)
			} catch (err) {
				setItems([])
				setOpen(true)
			}
		}, 200)
		return () => clearTimeout(t)
	}, [q])

	useEffect(() => {
		function onDown(e: MouseEvent) {
			if (!ref.current) return
			if (!ref.current.contains(e.target as Node)) setOpen(false)
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Enter') {
				e.preventDefault()
				if (open && items.length > 0 && highlight >= 0) {
					const idx = Math.min(Math.max(highlight, 0), items.length - 1)
					const it = items[idx]
					if (it) {
						router.push(`/products?q=${encodeURIComponent(q)}`)
						setOpen(false)
						return
					}
				}
				if (q.trim()) {
					router.push(`/products?q=${encodeURIComponent(q)}`)
					setOpen(false)
				}
			}
			if (!open) return
			if (e.key === 'ArrowDown') { 
				e.preventDefault()
				setHighlight(h => Math.min(h + 1, Math.max(0, items.length - 1))) 
			}
			if (e.key === 'ArrowUp') { 
				e.preventDefault()
				setHighlight(h => Math.max(h - 1, 0)) 
			}
		}
		document.addEventListener('mousedown', onDown)
		document.addEventListener('keydown', onKey)
		return () => { 
			document.removeEventListener('mousedown', onDown)
			document.removeEventListener('keydown', onKey) 
		}
	}, [open, items, highlight, router, q])

	function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (q.trim()) {
			router.push(`/products?q=${encodeURIComponent(q)}`)
			setOpen(false)
		}
	}

	return (
		<div className="md:hidden px-3 sm:px-4 py-2 sm:py-3">
			<div className="relative w-full max-w-full" ref={ref}>
				<form id="mobile-search-form" onSubmit={onSubmit} className="relative w-full">
					<div className="flex items-center border-2 border-brand-accent  bg-white shadow-sm focus-within:border-brand-accent focus-within:ring-0 transition-all overflow-hidden">
						<div className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 min-w-0 pr-1 sm:pr-1.5">
							<input 
								value={q} 
								onChange={(e) => setQ(e.target.value)} 
								onFocus={() => {
									if (q.trim() && items.length > 0) {
										setOpen(true)
									}
								}}
								className="w-full border-0 outline-none bg-transparent text-sm sm:text-base text-slate-900 placeholder-slate-500 focus:ring-0 focus:outline-none" 
								placeholder={placeholders[currentPlaceholder]}
								autoComplete="off"
							/>
						</div>
						<button 
							type="submit"
							className="px-2 sm:px-2.5 py-1.5 sm:py-2 bg-transparent hover:bg-transparent active:bg-transparent transition-colors flex-shrink-0 flex items-center justify-center touch-manipulation focus:outline-none focus:ring-0"
						>
							<Search className="h-5 w-5 sm:h-6 sm:w-6 text-brand-accent" strokeWidth={2.5} />
						</button>
					</div>
				</form>
				{/* Search Suggestions Dropdown - No Images */}
				{open && q.trim() && (
					<div className="absolute top-full left-0 right-0 z-[100] mt-1  border border-gray-200 bg-white shadow-xl max-h-72 sm:max-h-80 overflow-hidden">
						{items.length > 0 ? (
							<ul className="overflow-y-auto max-h-72 sm:max-h-80">
								{items.map((it, idx) => (
									<li 
										key={it._id || it.id || idx} 
										className={`px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors touch-manipulation ${idx === highlight ? 'bg-gray-50' : ''}`} 
										onMouseEnter={() => setHighlight(idx)} 
										onClick={() => {
											router.push(`/products?q=${encodeURIComponent(q)}`)
											setOpen(false)
											setQ('')
										}}
									>
										<div className="flex flex-col">
											<div className="font-medium text-gray-900 truncate">{it.title}</div>
											<div className="text-[10px] sm:text-xs text-gray-500 truncate mt-0.5">
												{it.brand || ''} 
												{(it.brand && (it.category || it.subCategory)) && ' • '}
												{it.subSubCategory || it.subCategory || it.category || ''}
											</div>
										</div>
									</li>
								))}
							</ul>
						) : (
							<div className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-500 text-center">
								No products found for "{q}"
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

