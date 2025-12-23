"use client"

import { useEffect, useState } from 'react'
import { X, ShoppingCart } from 'lucide-react'
import { useCartStore, cartTotal } from '@/store/cart'
import { formatCurrencyPKR } from '@/app/lib/price'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

type CartDrawerProps = {
	isOpen: boolean
	onClose: () => void
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
		<div className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
			{src && <img src={src} alt={title} className="h-full w-full object-cover" />}
		</div>
	)
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
	const { items } = useCartStore()
	const pathname = usePathname()
	const { status } = useSession()
	const [isMobile, setIsMobile] = useState(false)

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768)
		checkMobile()
		window.addEventListener('resize', checkMobile)
		return () => window.removeEventListener('resize', checkMobile)
	}, [])

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		return () => {
			document.body.style.overflow = ''
		}
	}, [isOpen])

	useEffect(() => {
		if (isOpen) onClose()
	}, [pathname])

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
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50 z-[60]"
					/>
					
					{/* Drawer */}
					<motion.div
						initial={isMobile ? { y: '100%' } : { x: '100%' }}
						animate={isMobile ? { y: 0 } : { x: 0 }}
						exit={isMobile ? { y: '100%' } : { x: '100%' }}
						transition={{ type: 'spring', damping: 30, stiffness: 300 }}
						className={`fixed z-[70] bg-white ${
							isMobile 
								? 'bottom-0 left-0 right-0 top-0 rounded-t-3xl safe-area-inset-bottom' 
								: 'top-0 right-0 bottom-0 w-full max-w-md shadow-2xl'
						}`}
					>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
							<div className="flex items-center gap-3">
								<ShoppingCart className="h-6 w-6 text-brand-accent" />
								<h2 className="text-lg font-semibold text-gray-900">Shopping Cart</h2>
								{items.length > 0 && (
									<span className="px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-medium">
										{items.length} {items.length === 1 ? 'item' : 'items'}
									</span>
								)}
							</div>
							<button
								onClick={onClose}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
								aria-label="Close cart"
							>
								<X className="h-5 w-5 text-gray-600" />
							</button>
						</div>

						{/* Cart Items */}
						<div className="flex flex-col h-[calc(100%-140px)] overflow-hidden">
							{items.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-full p-8 text-center">
									<ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
									<p className="text-gray-600 font-medium mb-2">Your cart is empty</p>
									<p className="text-sm text-gray-500">Add items to get started</p>
									<Link
										href="/products"
										onClick={onClose}
										className="mt-6 px-6 py-3 bg-brand-accent text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
									>
										Start Shopping
									</Link>
								</div>
							) : (
								<>
									<div className="flex-1 overflow-y-auto p-4 space-y-4">
										{items.map((i) => (
											<motion.div
												key={i.id}
												initial={{ opacity: 0, y: 20 }}
												animate={{ opacity: 1, y: 0 }}
												className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
											>
												<MiniThumb image={i.image} productId={i.productId} title={i.title} />
												<div className="flex-1 min-w-0">
													<h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">{i.title}</h3>
													{i.variantLabel && (
														<p className="text-xs text-gray-600 mb-2">{i.variantLabel}</p>
													)}
													<div className="flex items-center justify-between mt-2">
														<div className="flex items-center gap-2">
															<button
																onClick={() => onDecrement(i.id)}
																className="h-7 w-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-white transition-colors font-medium"
																aria-label="Decrease quantity"
															>
																-
															</button>
															<span className="w-8 text-center text-sm font-medium text-gray-900">{i.quantity}</span>
															<button
																onClick={() => onIncrement(i.id)}
																className="h-7 w-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-white transition-colors font-medium"
																aria-label="Increase quantity"
															>
																+
															</button>
														</div>
														<div className="text-sm font-semibold text-gray-900">
															{formatCurrencyPKR(i.unitPrice * i.quantity)}
														</div>
													</div>
												</div>
											</motion.div>
										))}
									</div>

									{/* Footer */}
									<div className="border-t border-gray-200 bg-white p-4 space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-base font-semibold text-gray-900">Subtotal</span>
											<span className="text-lg font-bold text-brand-accent">{formatCurrencyPKR(cartTotal(items))}</span>
										</div>
										<Link
											href="/checkout"
											onClick={onClose}
											className="block w-full text-center py-3.5 bg-brand-accent text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
										>
											Proceed to Checkout
										</Link>
										<Link
											href="/cart"
											onClick={onClose}
											className="block w-full text-center py-2.5 text-brand-accent font-medium hover:bg-orange-50 rounded-lg transition-colors"
										>
											View Full Cart
										</Link>
									</div>
								</>
							)}
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}

