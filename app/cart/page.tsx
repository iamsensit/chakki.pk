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
		<div className="h-10 w-10 sm:h-14 sm:w-14 md:h-20 md:w-20 rounded bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
			{src ? (
				<img src={src} alt={title} className="h-full w-full object-cover" />
			) : (
				<div className="h-full w-full bg-gray-200" />
			)}
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
		<div className="px-2 sm:px-4 md:container-pg py-1.5 sm:py-3 md:py-6 pb-20 md:pb-8">
			<h1 className="text-sm sm:text-base md:text-2xl font-semibold mb-1.5 sm:mb-3 md:mb-6">Your Cart</h1>
			<div className="grid gap-1.5 sm:gap-3 md:gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2 space-y-0 bg-white  border border-gray-200 overflow-hidden">
					{items.length === 0 && <div className="p-2 sm:p-3 md:p-6 text-[10px] sm:text-xs md:text-base text-slate-600 text-center">Your cart is empty.</div>}
					{items.map((i: any) => (
						<div key={i.id} className="p-1.5 sm:p-2.5 md:p-4 flex items-center gap-1.5 sm:gap-2.5 md:gap-4 border-b border-gray-200 last:border-b-0">
							<CartItemThumb image={i.image} productId={i.productId} title={i.title} />
							<div className="flex-1 min-w-0">
								<div className="font-medium text-[10px] sm:text-xs md:text-base text-slate-900 mb-0.5 leading-tight truncate">{i.title}</div>
								<div className="text-[9px] sm:text-[10px] md:text-sm text-slate-600 mb-1 sm:mb-1.5 md:mb-3 leading-tight">{i.variantLabel || '1kg pack'}</div>
								<div className="flex items-center justify-between gap-1 sm:gap-2">
									<div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
										<button 
											aria-label="Decrease" 
											onClick={() => updateQty(i.id, Math.max(1, i.quantity - 1))} 
											className="h-5 w-5 sm:h-7 sm:w-7 md:h-9 md:w-9 rounded border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
										>
											<Minus className="h-2 w-2 sm:h-3 sm:w-3 md:h-4 md:w-4 text-gray-700" strokeWidth={3} />
										</button>
										<input 
											aria-label="Quantity" 
											type="number" 
											min={1} 
											value={i.quantity} 
											onChange={(e) => updateQty(i.id, Number(e.target.value))} 
											className="w-7 sm:w-10 md:w-14 h-5 sm:h-7 md:h-9 rounded border border-gray-200 bg-white px-0.5 text-center text-[9px] sm:text-[10px] md:text-sm font-medium text-slate-900 focus:ring-1 focus:ring-brand-accent/20 focus:border-brand-accent transition-all" 
										/>
										<button 
											aria-label="Increase" 
											onClick={() => updateQty(i.id, i.quantity + 1)} 
											className="h-5 w-5 sm:h-7 sm:w-7 md:h-9 md:w-9 rounded border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
										>
											<Plus className="h-2 w-2 sm:h-3 sm:w-3 md:h-4 md:w-4 text-gray-700" strokeWidth={3} />
										</button>
									</div>
									<div className="flex items-center gap-1 sm:gap-1.5 md:gap-3">
										<div className="font-semibold text-[10px] sm:text-xs md:text-base text-slate-900 whitespace-nowrap">{formatCurrencyPKR(i.unitPrice * i.quantity)}</div>
										<button 
											aria-label="Remove item" 
											onClick={() => handleRemove(i)} 
											className="p-0.5 sm:p-1 md:p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors active:bg-red-100 touch-manipulation"
										>
											<Trash2 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" strokeWidth={2} />
										</button>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
				<div className=" border border-gray-200 bg-white p-2 sm:p-3 md:p-6 h-fit lg:sticky lg:top-20">
					<div className="flex items-center justify-between mb-1.5 sm:mb-3 md:mb-4">
						<div className="text-[10px] sm:text-xs md:text-base font-medium text-slate-600">Subtotal</div>
						<div className="font-semibold text-[10px] sm:text-sm md:text-lg text-slate-900">{formatCurrencyPKR(total)}</div>
					</div>
					<Link href="/checkout" className="block w-full mt-1.5 sm:mt-3 md:mt-4 bg-brand-accent hover:bg-brand text-white font-medium text-center py-1.5 sm:py-2.5 md:py-3.5 text-[10px] sm:text-xs md:text-base transition-colors active:bg-brand-dark touch-manipulation">
						Go to checkout
					</Link>
				</div>
			</div>
		</div>
	)
}
