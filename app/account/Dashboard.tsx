"use client"

import { useState, useEffect } from 'react'
import AccountClient from './AccountClient'
import OrderHistoryClient from './OrderHistoryClient'
import { User, ClipboardList, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart'

function CartPanel() {
	const [loading, setLoading] = useState(true)
	const [items, setItems] = useState<any[]>([])

	useEffect(() => {
		;(async () => {
			try {
				const res = await fetch('/api/cart', { cache: 'no-store' })
				const json = await res.json()
				let serverItems = Array.isArray(json?.data?.items) ? json.data.items : []
				// Backfill images if missing to match navbar mini cart
				const withImages = await Promise.all(serverItems.map(async (it: any) => {
					if (it?.image) return it
					try {
						const pRes = await fetch(`/api/products/${it.productId}`, { cache: 'no-store' })
						const pJson = await pRes.json()
						const img = pJson?.data?.images?.[0] || null
						return { ...it, image: img }
					} catch {
						return it
					}
				}))
				setItems(withImages)
				// Update global local cart so other components (navbar mini cart) stay in sync
				useCartStore.getState().setAll(withImages.map((i: any) => ({
					productId: i.productId,
					variantId: i.variantId,
					title: i.title,
					variantLabel: i.variantLabel,
					image: i.image,
					quantity: i.quantity,
					unitPrice: i.unitPrice
				})))
			} catch {
				setItems([])
			} finally {
				setLoading(false)
			}
		})()
	}, [])

	async function updateQuantity(productId: string, variantId: string | null | undefined, quantity: number) {
		try {
			const res = await fetch('/api/cart', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ productId, variantId, quantity })
			})
			if (!res.ok) return
			const updatedItems = items
				.map(i =>
					i.productId === productId && String(i.variantId || '') === String(variantId || '')
						? { ...i, quantity }
						: i
				).filter(i => i.quantity > 0)
			setItems(updatedItems)
			// Also update global store to keep navbar/cart in sync
			useCartStore.getState().setAll(updatedItems.map((i: any) => ({
				productId: i.productId,
				variantId: i.variantId,
				title: i.title,
				variantLabel: i.variantLabel,
				image: i.image,
				quantity: i.quantity,
				unitPrice: i.unitPrice
			})))
		} catch {}
	}

	const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

	if (loading) return <div className="skeleton h-24" />

	if (items.length === 0) {
		return <div className="rounded-md border p-4 text-sm text-slate-600">Your server cart is empty.</div>
	}

	return (
		<div className="rounded-md border">
			<div className="divide-y">
				{items.map((i, idx) => (
					<div key={idx} className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
						<div className="h-8 w-8 sm:h-10 sm:w-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
							{i.image ? <img src={i.image} className="h-full w-full object-cover" alt={i.title} /> : <div className="h-full w-full bg-gray-200" />}
						</div>
						<div className="flex-1 min-w-0">
							<div className="truncate font-medium">{i.title}</div>
							<div className="text-xs text-slate-600 truncate">{i.variantLabel}</div>
						</div>
						<div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
							<button aria-label="Decrease" className="h-6 w-6 rounded border text-xs" onClick={() => updateQuantity(i.productId, i.variantId ?? null, Math.max(0, i.quantity - 1))}>-</button>
							<div className="w-6 text-center text-xs sm:text-sm">{i.quantity}</div>
							<button aria-label="Increase" className="h-6 w-6 rounded border text-xs" onClick={() => updateQuantity(i.productId, i.variantId ?? null, i.quantity + 1)}>+</button>
						</div>
						<div className="text-xs sm:text-sm font-semibold min-w-[60px] sm:min-w-[72px] text-right">Rs. {i.unitPrice * i.quantity}</div>
					</div>
				))}
			</div>
			<div className="flex items-center justify-between p-2 sm:p-3 text-xs sm:text-sm">
				<div className="text-slate-600">Subtotal</div>
				<div className="font-semibold">Rs. {subtotal}</div>
			</div>
			<div className="p-2 sm:p-3">
				<a href="/checkout" className="block w-full text-center rounded-md bg-brand-accent px-3 py-1.5 text-white text-xs sm:text-sm">Go to checkout</a>
			</div>
		</div>
	)
}

export default function Dashboard() {
	const [tab, setTab] = useState<'profile' | 'orders' | 'cart'>('profile')

	return (
		<div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
			<aside className="lg:col-span-3">
				<div className="rounded-md border overflow-hidden bg-white flex lg:flex-col">
					<button onClick={() => setTab('profile')} className={`flex-1 lg:w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm border-r lg:border-r-0 lg:border-b transition-colors ${tab === 'profile' ? 'bg-brand text-white' : 'hover:bg-gray-50'}`}>
						<User className="h-4 w-4" /> <span className="hidden sm:inline">Profile & Security</span><span className="sm:hidden">Profile</span>
					</button>
					<button onClick={() => setTab('orders')} className={`flex-1 lg:w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm border-r lg:border-r-0 lg:border-b transition-colors ${tab === 'orders' ? 'bg-brand text-white' : 'hover:bg-gray-50'}`}>
						<ClipboardList className="h-4 w-4" /> Orders
					</button>
					<button onClick={() => setTab('cart')} className={`flex-1 lg:w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm transition-colors ${tab === 'cart' ? 'bg-brand text-white' : 'hover:bg-gray-50'}`}>
						<ShoppingCart className="h-4 w-4" /> <span className="hidden sm:inline">Server Cart</span><span className="sm:hidden">Cart</span>
					</button>
				</div>
			</aside>
			<section className="lg:col-span-9 mt-4 lg:mt-0">
				{tab === 'profile' && <AccountClient />}
				{tab === 'orders' && <OrderHistoryClient />}
				{tab === 'cart' && <CartPanel />}
			</section>
		</div>
	)
}


