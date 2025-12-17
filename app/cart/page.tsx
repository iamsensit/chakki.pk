"use client"

import Link from 'next/link'
import { useCartStore, cartTotal } from '@/store/cart'
import { formatCurrencyPKR } from '@/app/lib/price'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

function CartItemThumb({ image, productId, title }: { image?: string; productId: string; title: string }) {
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
		<div className="h-24 w-24 sm:h-20 sm:w-20 rounded bg-gray-100 overflow-hidden flex-shrink-0">
			{src && <img src={src} alt={title} className="h-full w-full object-cover" />}
		</div>
	)
}

export default function CartPage() {
	const { items, updateQty, remove } = useCartStore() as any
	const total = cartTotal(items)
	const { status } = useSession()

	async function handleRemove(i: any) {
		remove(i.id)
		if (status === 'authenticated') {
			const params = new URLSearchParams()
			params.set('productId', i.productId)
			if (i.variantId) params.set('variantId', i.variantId)
			try { await fetch(`/api/cart?${params.toString()}`, { method: 'DELETE' }) } catch {}
		}
	}

	return (
		<div className="container-pg py-8">
			<h1 className="text-2xl font-semibold">Your Cart</h1>
			<div className="mt-6 grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2 divide-y rounded-md border">
					{items.length === 0 && <div className="p-6 text-slate-600">Your cart is empty.</div>}
					{items.map((i: any) => (
						<div key={i.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
							<CartItemThumb image={i.image} productId={i.productId} title={i.title} />
							<div className="flex-1 min-w-0">
								<div className="font-medium truncate">{i.title}</div>
								<div className="text-xs text-slate-600">{i.variantLabel}</div>
								<div className="mt-2 flex items-center gap-2 sm:gap-3 text-sm">
									<button aria-label="Decrease" onClick={() => updateQty(i.id, Math.max(1, i.quantity - 1))} className="rounded-md border p-1 hover:bg-gray-50"><Minus className="h-4 w-4" /></button>
									<input aria-label="Quantity" type="number" min={1} value={i.quantity} onChange={(e) => updateQty(i.id, Number(e.target.value))} className="w-16 rounded border px-2 py-1 text-center" />
									<button aria-label="Increase" onClick={() => updateQty(i.id, i.quantity + 1)} className="rounded-md border p-1 hover:bg-gray-50"><Plus className="h-4 w-4" /></button>
									<button aria-label="Remove item" onClick={() => handleRemove(i)} className="ml-1 sm:ml-2 text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
								</div>
							</div>
							<div className="font-semibold sm:ml-auto">{formatCurrencyPKR(i.unitPrice * i.quantity)}</div>
						</div>
					))}
				</div>
				<div className="rounded-md border p-4 h-fit sticky top-20">
					<div className="flex items-center justify-between">
						<div className="text-sm text-slate-600">Subtotal</div>
						<div className="font-semibold">{formatCurrencyPKR(total)}</div>
					</div>
					<Link href="/checkout" className="mt-4 block w-full rounded-md bg-brand-accent px-3 py-2 text-center text-white">Proceed to Checkout</Link>
				</div>
			</div>
		</div>
	)
}
