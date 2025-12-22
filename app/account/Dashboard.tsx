"use client"

import { useState, useEffect, lazy, Suspense } from 'react'
import { User, ClipboardList, ShoppingCart, Star, Heart, CreditCard } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { formatCurrencyPKR } from '@/app/lib/price'

// Lazy load tab components for faster initial load
const AccountClient = lazy(() => import('./AccountClient'))
const OrderHistoryClient = lazy(() => import('./OrderHistoryClient'))
const ReviewsClient = lazy(() => import('./ReviewsClient'))
const WishlistClient = lazy(() => import('./WishlistClient'))
const PaymentMethodsClient = lazy(() => import('./PaymentMethodsClient'))

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
		return (
			<div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
				<div className="text-center text-slate-600">Your cart is empty.</div>
			</div>
		)
	}

	return (
		<div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
			<div className="divide-y divide-slate-200">
				{items.map((i, idx) => (
					<div key={idx} className="p-4 sm:p-6 flex items-center gap-4">
						<div className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
							{i.image ? (
								<img src={i.image} className="h-full w-full object-cover" alt={i.title} />
							) : (
								<div className="h-full w-full bg-slate-200" />
							)}
						</div>
						<div className="flex-1 min-w-0">
							<div className="font-semibold text-slate-900 mb-1">{i.title}</div>
							<div className="text-sm text-slate-600">{i.variantLabel}</div>
						</div>
						<div className="flex items-center gap-2 flex-shrink-0">
							<button 
								aria-label="Decrease" 
								className="h-8 w-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center font-medium" 
								onClick={() => updateQuantity(i.productId, i.variantId ?? null, Math.max(0, i.quantity - 1))}
							>
								-
							</button>
							<div className="w-10 text-center text-sm font-medium text-slate-900">{i.quantity}</div>
							<button 
								aria-label="Increase" 
								className="h-8 w-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center font-medium" 
								onClick={() => updateQuantity(i.productId, i.variantId ?? null, i.quantity + 1)}
							>
								+
							</button>
						</div>
						<div className="text-base font-bold text-slate-900 min-w-[80px] text-right">
							{formatCurrencyPKR(i.unitPrice * i.quantity)}
						</div>
					</div>
				))}
			</div>
			<div className="flex items-center justify-between p-4 sm:p-6 border-t border-slate-200 bg-slate-50">
				<div className="text-base font-semibold text-slate-900">Subtotal</div>
				<div className="text-lg font-bold text-slate-900">{formatCurrencyPKR(subtotal)}</div>
			</div>
			<div className="p-4 sm:p-6">
				<a 
					href="/checkout" 
					className="block w-full text-center rounded-lg bg-brand-accent px-6 py-3.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
				>
					Go to checkout
				</a>
			</div>
		</div>
	)
}

export default function Dashboard() {
	const [tab, setTab] = useState<'profile' | 'orders' | 'cart' | 'reviews' | 'wishlist' | 'payment-methods'>('profile')

	return (
		<div className="grid gap-6 lg:grid-cols-12">
			<aside className="lg:col-span-3">
				<nav className="space-y-1">
					<button 
						onClick={() => setTab('profile')} 
						className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors rounded-lg ${
							tab === 'profile' 
								? 'bg-brand-accent text-white hover:bg-orange-600' 
								: 'text-slate-700 hover:bg-orange-50 hover:text-brand-accent'
						}`}
					>
						<User className="h-5 w-5" /> 
						<span className="hidden sm:inline">Profile & Security</span>
						<span className="sm:hidden">Profile</span>
					</button>
					<button 
						onClick={() => setTab('orders')} 
						className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors rounded-lg ${
							tab === 'orders' 
								? 'bg-brand-accent text-white hover:bg-orange-600' 
								: 'text-slate-700 hover:bg-orange-50 hover:text-brand-accent'
						}`}
					>
						<ClipboardList className="h-5 w-5" /> 
						Orders
					</button>
					<button 
						onClick={() => setTab('reviews')} 
						className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors rounded-lg ${
							tab === 'reviews' 
								? 'bg-brand-accent text-white hover:bg-orange-600' 
								: 'text-slate-700 hover:bg-orange-50 hover:text-brand-accent'
						}`}
					>
						<Star className="h-5 w-5" /> 
						<span className="hidden sm:inline">Reviews</span>
						<span className="sm:hidden">Reviews</span>
					</button>
					<button 
						onClick={() => setTab('wishlist')} 
						className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors rounded-lg ${
							tab === 'wishlist' 
								? 'bg-brand-accent text-white hover:bg-orange-600' 
								: 'text-slate-700 hover:bg-orange-50 hover:text-brand-accent'
						}`}
					>
						<Heart className="h-5 w-5" /> 
						<span className="hidden sm:inline">Wishlist</span>
						<span className="sm:hidden">Wishlist</span>
					</button>
					<button 
						onClick={() => setTab('cart')} 
						className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors rounded-lg ${
							tab === 'cart' 
								? 'bg-brand-accent text-white hover:bg-orange-600' 
								: 'text-slate-700 hover:bg-orange-50 hover:text-brand-accent'
						}`}
					>
						<ShoppingCart className="h-5 w-5" /> 
						Cart
					</button>
					<button 
						onClick={() => setTab('payment-methods')} 
						className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors rounded-lg ${
							tab === 'payment-methods' 
								? 'bg-brand-accent text-white hover:bg-orange-600' 
								: 'text-slate-700 hover:bg-orange-50 hover:text-brand-accent'
						}`}
					>
						<CreditCard className="h-5 w-5" /> 
						<span className="hidden sm:inline">Payment Methods</span>
						<span className="sm:hidden">Payments</span>
					</button>
				</nav>
			</aside>
			<section className="lg:col-span-9 mt-4 lg:mt-0">
				<Suspense fallback={<div className="skeleton h-64 rounded-md" />}>
					{tab === 'profile' && <AccountClient />}
					{tab === 'orders' && <OrderHistoryClient />}
					{tab === 'reviews' && <ReviewsClient />}
					{tab === 'wishlist' && <WishlistClient />}
					{tab === 'cart' && <CartPanel />}
					{tab === 'payment-methods' && <PaymentMethodsClient />}
				</Suspense>
			</section>
		</div>
	)
}


