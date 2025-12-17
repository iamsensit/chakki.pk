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
			if (!q.trim()) { setItems([]); setOpen(false); return }
			try {
				const res = await fetch(`/api/products?suggest=1&q=${encodeURIComponent(q)}&limit=8`)
				const json = await res.json()
				setItems(json?.data?.items || [])
				setOpen(true)
			} catch {
				setItems([]); setOpen(false)
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
		<div className="relative" ref={ref}>
			<form id="search-form" onSubmit={onSubmit} className="relative">
				<input 
					value={q} 
					onChange={(e) => setQ(e.target.value)} 
					className="w-full border-0 outline-none bg-transparent text-sm text-slate-900 placeholder-slate-500" 
					placeholder="Search products..." 
				/>
			</form>
			{open && items.length > 0 && (
				<div className="absolute z-50 mt-2 w-full rounded-md border bg-white text-slate-900 shadow">
					<ul className="max-h-80 overflow-auto">
						{items.map((it, idx) => (
							<li key={it._id || it.id} className={`px-3 py-2 text-sm cursor-pointer ${idx === highlight ? 'bg-gray-50' : ''}`} onMouseEnter={() => setHighlight(idx)} onClick={() => router.push(`/products/${it._id || it.id}`)}>
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
										{it.images?.[0] && <img src={it.images[0]} alt="thumb" className="h-full w-full object-cover" />}
									</div>
									<div className="min-w-0">
										<div className="font-medium truncate">{it.title}</div>
										<div className="text-xs text-slate-600 truncate">{it.brand || ''} {it.category ? `• ${it.category}` : ''}</div>
									</div>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}
