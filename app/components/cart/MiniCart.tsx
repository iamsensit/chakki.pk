"use client"

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useCartStore, cartTotal } from '@/store/cart'
import { formatCurrencyPKR } from '@/app/lib/price'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

type MiniCartProps = {
	variant?: 'default' | 'compact'
	iconColor?: string
	badgeColor?: string
}

function MiniThumb({ image, productId, title }: { image?: string; productId: string; title: string }) {
	const [src, setSrc] = useState<string | undefined>(image)
	useEffect(() => {
		let mounted = true
		if (!image && productId) {
			fetch(`/api/products/${productId}`).then(r => r.ok ? r.json() : null).then(json => {
				if (mounted && json?.data?.images?.[0]) setSrc(json.data.images[0])
			})
		}
		return () => { mounted = false }
	}, [image, productId])
	return (
		<div className="h-12 w-12 rounded bg-gray-100 overflow-hidden">
			{src && <img src={src} alt={title} className="h-full w-full object-cover" />}
		</div>
	)
}

export default function MiniCart({ variant = 'default', iconColor = 'currentColor', badgeColor = 'bg-red-500' }: MiniCartProps = {}) {
	const { items } = useCartStore()
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)
	const pathname = usePathname()
	const isCompact = variant === 'compact'
	const { status } = useSession()

	useEffect(() => { setOpen(false) }, [pathname])

	useEffect(() => {
		function onDown(e: MouseEvent) {
			if (!ref.current) return
			if (!ref.current.contains(e.target as Node)) setOpen(false)
		}
		function onEsc(e: KeyboardEvent) {
			if (e.key === 'Escape') setOpen(false)
		}
		document.addEventListener('mousedown', onDown)
		document.addEventListener('keydown', onEsc)
		return () => {
			document.removeEventListener('mousedown', onDown)
			document.removeEventListener('keydown', onEsc)
		}
	}, [])

	async function syncQty(productId: string, variantId: string | undefined, quantity: number) {
		if (status !== 'authenticated') return
		try {
			await fetch('/api/cart', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ productId, variantId, quantity })
			})
		} catch {}
	}

	function onDecrement(id: string) {
		const it = useCartStore.getState().items.find(i => i.id === id)
		if (!it) return
		const newQty = it.quantity - 1
		useCartStore.getState().decrement(id)
		void syncQty(it.productId, it.variantId, Math.max(0, newQty))
	}

	function onIncrement(id: string) {
		const it = useCartStore.getState().items.find(i => i.id === id)
		if (!it) return
		const newQty = it.quantity + 1
		useCartStore.getState().increment(id)
		void syncQty(it.productId, it.variantId, newQty)
	}

	return (
		<div className={`relative ${isCompact ? '' : 'flex flex-col items-center gap-1'}`} ref={ref}>
			<button aria-label="Cart" className="relative hover:opacity-80 transition-opacity" onClick={() => setOpen(o => !o)}>
				<div className="relative">
					<ShoppingCart className={isCompact ? 'h-5 w-5' : 'h-6 w-6'} strokeWidth={1.5} style={{ color: iconColor }} />
					{items.length > 0 && (
						<span className={`absolute -top-2 -right-2 ${isCompact ? 'h-4 w-4 text-[10px]' : 'h-5 w-5 text-xs'} rounded-full ${badgeColor} text-white flex items-center justify-center font-bold`}>
							{items.length}
						</span>
					)}
				</div>
			</button>
			{!isCompact && <span className="text-xs">Cart</span>}
			{open && (
				<div className="absolute right-0 top-full mt-2 z-50 w-[90vw] max-w-[22rem] rounded-md border bg-white text-slate-900 shadow-lg">
					<div className="p-3 border-b font-medium">Cart</div>
					<div className="max-h-64 overflow-auto divide-y">
						{items.length === 0 && <div className="p-3 text-sm text-slate-500">Your cart is empty.</div>}
						{items.map(i => (
							<div key={i.id} className="p-3 text-sm flex items-center gap-3">
								<MiniThumb image={i.image} productId={i.productId} title={i.title} />
								<div className="flex-1 min-w-0">
									<div className="truncate font-medium">{i.title}</div>
									<div className="text-xs text-slate-600">{i.variantLabel}</div>
								</div>
								<div className="flex items-center gap-2">
									<button aria-label="Decrease" className="h-6 w-6 rounded border" onClick={() => onDecrement(i.id)}>-</button>
									<div className="w-6 text-center">{i.quantity}</div>
									<button aria-label="Increase" className="h-6 w-6 rounded border" onClick={() => onIncrement(i.id)}>+</button>
								</div>
								<div className="text-sm font-semibold min-w-[72px] text-right">{formatCurrencyPKR(i.unitPrice * i.quantity)}</div>
							</div>
						))}
					</div>
					<div className="flex items-center justify-between p-3">
						<div className="text-sm text-slate-600">Subtotal</div>
						<div className="font-semibold">{formatCurrencyPKR(cartTotal(items))}</div>
					</div>
					<div className="p-3">
						<Link href="/cart" className="block w-full text-center rounded-md bg-brand-accent px-3 py-2 text-white" onClick={() => setOpen(false)}>Go to cart</Link>
					</div>
				</div>
			)}
		</div>
	)
}
