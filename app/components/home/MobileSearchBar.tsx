"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight } from 'lucide-react'

export default function MobileSearchBar() {
	const [q, setQ] = useState('')
	const [open, setOpen] = useState(false)
	const [items, setItems] = useState<any[]>([])
	const [highlight, setHighlight] = useState(0)
	const ref = useRef<HTMLDivElement>(null)
	const router = useRouter()

	useEffect(() => {
		const t = setTimeout(async () => {
			if (!q.trim()) { 
				setItems([])
				setOpen(false)
				return 
			}
			try {
				const res = await fetch(`/api/products?suggest=1&q=${encodeURIComponent(q)}&limit=8`)
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
			router.push(`/products?q=${encodeURIComponent(q.trim())}`)
			setOpen(false)
		}
	}

	return (
		<div className="md:hidden px-4 py-2 bg-white">
			<div className="relative w-full" ref={ref}>
				<form id="mobile-search-form" onSubmit={onSubmit} className="relative w-full">
					<div className="relative flex items-center rounded-full border border-[#E2E8F0] bg-slate-50/80 shadow-xs focus-within:bg-white focus-within:border-[#7EB338] focus-within:ring-2 focus-within:ring-[#7EB338]/15 transition-all">
						{/* Search Icon */}
						<div className="pl-3.5 pr-2 text-[#7EB338] flex items-center justify-center pointer-events-none">
							<Search className="h-4 w-4 stroke-[2.5]" />
						</div>

						{/* Search Input */}
						<input 
							value={q} 
							onChange={(e) => setQ(e.target.value)} 
							onFocus={() => {
								if (q.trim() && items.length > 0) {
									setOpen(true)
								}
							}}
							className="flex-1 py-2.5 bg-transparent text-xs text-[#2D3748] placeholder-[#718096] focus:outline-none min-w-0" 
							placeholder="Search whole wheat atta, rice, pulses, spices..."
							autoComplete="off"
						/>

						{/* Clear Button */}
						{q.trim() && (
							<button
								type="button"
								onClick={() => {
									setQ('')
									setItems([])
									setOpen(false)
								}}
								className="p-1.5 text-[#718096] hover:text-[#2D3748] transition-colors"
								aria-label="Clear search"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						)}

						{/* Search Action Pill Button */}
						<button 
							type="submit"
							className="m-1 h-7 w-7 rounded-full bg-[#7EB338] hover:bg-[#6fa02f] text-white flex items-center justify-center flex-shrink-0 shadow-xs transition-transform active:scale-95"
							aria-label="Submit search"
						>
							<ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
						</button>
					</div>
				</form>

				{/* Search Suggestions Dropdown */}
				{open && q.trim() && (
					<div className="absolute top-full left-0 right-0 z-[100] mt-2 rounded-2xl border border-[#E2E8F0] bg-white shadow-xl max-h-72 overflow-hidden">
						{items.length > 0 ? (
							<ul className="overflow-y-auto max-h-72 divide-y divide-[#E2E8F0]">
								{items.map((it, idx) => (
									<li 
										key={it._id || it.id || idx} 
										className={`px-3.5 py-2.5 text-xs cursor-pointer hover:bg-[#F5EFE0] active:bg-[#F5EFE0] transition-colors flex items-center justify-between ${idx === highlight ? 'bg-[#F5EFE0]' : ''}`} 
										onMouseEnter={() => setHighlight(idx)} 
										onClick={() => {
											router.push(`/products/${it.slug || it._id || it.id}`)
											setOpen(false)
											setQ('')
										}}
									>
										<div className="flex items-center gap-2.5 min-w-0">
											<div className="h-8 w-8 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
												{it.images?.[0] ? (
													<img src={it.images[0]} alt={it.title} className="h-full w-full object-cover" />
												) : (
													<Search className="h-3.5 w-3.5 text-[#718096]" />
												)}
											</div>
											<div className="flex flex-col min-w-0">
												<span className="font-bold text-[#2D3748] truncate">{it.title}</span>
												<span className="text-[10px] text-[#718096] truncate">
													{it.category || 'Wholesale Grocery'}
												</span>
											</div>
										</div>
										<ArrowRight className="h-3.5 w-3.5 text-[#718096] flex-shrink-0" />
									</li>
								))}
							</ul>
						) : (
							<div className="px-4 py-3 text-xs text-[#718096] text-center">
								No products found for &quot;{q}&quot;
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
