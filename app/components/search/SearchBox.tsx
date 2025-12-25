"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export default function SearchBox() {
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
				console.log('🔍 Searching for:', q)
				const res = await fetch(`/api/products?suggest=1&q=${encodeURIComponent(q)}&limit=20`)
				const json = await res.json()
				console.log('📥 Search response:', { ok: res.ok, success: json?.success, itemsCount: json?.data?.items?.length || 0 })
				
				if (!res.ok || !json?.success) {
					console.error('❌ Search API error:', json)
					setItems([])
					setOpen(true) // Show dropdown even on error to indicate search is active
					return
				}
				const items = json?.data?.items || []
				console.log('✅ Search results:', items.length, 'items for query:', q, items)
				setItems(items)
				setOpen(true) // Always show dropdown when there's a query
			} catch (err) {
				console.error('❌ Search fetch error:', err)
				setItems([])
				setOpen(true) // Show dropdown even on error
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
				if (open && items.length > 0) {
					const idx = Math.min(Math.max(highlight, 0), items.length - 1)
					const it = items[idx]
					if (it) router.push(`/products/${it._id || it.id}`)
					return
				}
				if (q.trim()) router.push(`/products?${new URLSearchParams({ q }).toString()}`)
			}
			if (!open) return
			if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, Math.max(0, items.length - 1))) }
			if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
		}
		document.addEventListener('mousedown', onDown)
		document.addEventListener('keydown', onKey)
		return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
	}, [open, items, highlight, router, q])

	function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (q.trim()) router.push(`/products?${new URLSearchParams({ q }).toString()}`)
	}

	return (
		<div className="relative w-full" ref={ref}>
			<form id="search-form" onSubmit={onSubmit} className="relative w-full">
				<input 
					value={q} 
					onChange={(e) => setQ(e.target.value)} 
					onFocus={() => {
						if (q.trim() && items.length > 0) {
							setOpen(true)
						}
					}}
					className="w-full border-0 outline-none bg-transparent text-sm text-slate-900 placeholder-slate-500" 
					placeholder="Search products..." 
					autoComplete="off"
				/>
			</form>
			{open && q.trim() && (
				<div className="absolute top-full left-0 right-0 z-[100] mt-1  border border-gray-200 bg-white text-slate-900 shadow-xl max-h-96 overflow-hidden">
					{items.length > 0 ? (
						<ul className="overflow-y-auto max-h-96">
							{items.map((it, idx) => (
								<li 
									key={it._id || it.id || idx} 
									className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${idx === highlight ? 'bg-gray-100' : ''}`} 
									onMouseEnter={() => setHighlight(idx)} 
									onClick={() => {
										const productId = it.slug || it._id || it.id
										router.push(`/products/${productId}`)
										setOpen(false)
										setQ('')
									}}
								>
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
											{it.images?.[0] ? (
												<img src={it.images[0]} alt="thumb" className="h-full w-full object-cover" />
											) : (
												<div className="h-full w-full flex items-center justify-center text-xs text-gray-400">No img</div>
											)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="font-medium truncate">{it.title}</div>
											<div className="text-xs text-slate-600 truncate">
												{it.brand || ''} 
												{(it.brand && (it.category || it.subCategory)) && ' • '}
												{it.subSubCategory || it.subCategory || it.category || ''}
											</div>
										</div>
									</div>
								</li>
							))}
						</ul>
					) : (
						<div className="px-4 py-3 text-sm text-slate-500 text-center">
							No products found for "{q}"
						</div>
					)}
				</div>
			)}
		</div>
	)
}
