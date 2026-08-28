"use client"

import { useEffect, useState } from 'react'
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Truck, Sparkles } from 'lucide-react'
import { useCartStore, cartTotal } from '@/store/cart'
import { formatCurrencyPKR } from '@/app/lib/price'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

type CartDrawerProps = {
	isOpen?: boolean
	open?: boolean
	onClose?: () => void
}

const FREE_DELIVERY_THRESHOLD = 2000

export default function CartDrawer({ isOpen: propIsOpen, open: propOpen, onClose: propOnClose }: CartDrawerProps) {
	const { items, updateQty, remove, isDrawerOpen, closeDrawer } = useCartStore()
	const pathname = usePathname()
	const router = useRouter()
	const { status } = useSession()
	const [isMounted, setIsMounted] = useState(false)

	// Support both store-driven state and component props
	const activeOpen = propIsOpen !== undefined ? propIsOpen : propOpen !== undefined ? propOpen : isDrawerOpen
	const handleClose = () => {
		if (propOnClose) propOnClose()
		closeDrawer()
	}

	useEffect(() => {
		setIsMounted(true)
	}, [])

	useEffect(() => {
		if (activeOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		return () => {
			document.body.style.overflow = ''
		}
	}, [activeOpen])

	useEffect(() => {
		if (activeOpen) handleClose()
	}, [pathname])

	const subtotal = cartTotal(items)
	const totalItemsCount = items.reduce((acc, i) => acc + i.quantity, 0)
	const freeDeliveryProgress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100))
	const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)

	async function handleRemove(id: string, productId: string, variantId?: string) {
		remove(id)
		if (status === 'authenticated') {
			try {
				const params = new URLSearchParams()
				params.set('productId', productId)
				if (variantId) params.set('variantId', variantId)
				await fetch(`/api/cart?${params.toString()}`, { method: 'DELETE' })
			} catch {}
		}
	}

	async function handleQtyChange(id: string, productId: string, variantId: string | undefined, newQty: number) {
		updateQty(id, newQty)
		if (status === 'authenticated') {
			try {
				await fetch('/api/cart', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ productId, variantId, quantity: newQty })
				})
			} catch {}
		}
	}

	if (!isMounted) return null

	return (
		<AnimatePresence>
			{activeOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={handleClose}
						className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70]"
					/>
					
					{/* Slide-in Drawer from Right (Desktop) / Bottom Sheet (Mobile) */}
					<motion.aside
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', damping: 28, stiffness: 280 }}
						className="fixed top-0 right-0 bottom-0 z-[80] bg-white w-full max-w-md shadow-2xl flex flex-col justify-between overflow-hidden"
						aria-label="Shopping Cart Drawer"
					>
						{/* Header */}
						<div className="p-4 sm:p-5 border-b border-[#E2E8F0] bg-white flex items-center justify-between z-10 shadow-xs">
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-xl bg-[#7EB338]/10 text-[#7EB338]">
									<ShoppingCart className="h-5 w-5" />
								</div>
								<div>
									<h2 className="text-base font-extrabold text-[#2D3748]">Your Cart</h2>
									<p className="text-xs font-semibold text-[#718096]">
										{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} selected
									</p>
								</div>
							</div>

							<button
								onClick={handleClose}
								className="p-2 rounded-full text-[#718096] hover:text-[#2D3748] hover:bg-slate-100 transition-colors"
								aria-label="Close cart"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						{/* Free Delivery Bar */}
						{items.length > 0 && (
							<div className="px-5 py-3 bg-[#F5EFE0] border-b border-[#E2E8F0]">
								<div className="flex items-center justify-between text-xs font-bold text-[#2D3748] mb-1.5">
									<span className="flex items-center gap-1.5">
										<Truck className="h-3.5 w-3.5 text-[#7EB338]" />
										{remainingForFreeDelivery === 0 ? (
											<span className="text-[#7EB338]">You unlocked FREE Delivery! 🎉</span>
										) : (
											<span>Add Rs. {remainingForFreeDelivery.toLocaleString()} for FREE Delivery</span>
										)}
									</span>
									<span className="text-[11px] text-[#718096]">{freeDeliveryProgress}%</span>
								</div>
								<div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
									<div 
										className="h-full bg-[#7EB338] transition-all duration-300 rounded-full"
										style={{ width: `${freeDeliveryProgress}%` }}
									/>
								</div>
							</div>
						)}

						{/* Items List */}
						<div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-[#E2E8F0]">
							{items.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-3">
									<div className="h-16 w-16 rounded-full bg-[#F5EFE0] text-[#7EB338] flex items-center justify-center">
										<ShoppingCart className="h-8 w-8" />
									</div>
									<h3 className="text-base font-bold text-[#2D3748]">Your Bag is Empty</h3>
									<p className="text-xs text-[#718096] max-w-xs">
										Looks like you haven&apos;t added any wholesale groceries to your bag yet.
									</p>
									<Link
										href="/products"
										onClick={handleClose}
										className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#7EB338] hover:bg-[#6fa02f] text-white text-xs font-bold transition-all shadow-sm"
									>
										<span>Start Shopping</span>
										<ArrowRight className="h-3.5 w-3.5" />
									</Link>
								</div>
							) : (
								items.map((item) => {
									const itemTotal = (item.unitPrice || 0) * (item.quantity || 1)
									return (
										<div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-3.5 group">
											{/* Thumbnail */}
											<div className="relative h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-slate-50 border border-[#E2E8F0] p-1.5 flex-shrink-0 flex items-center justify-center overflow-hidden">
												{item.image ? (
													<img src={item.image} alt={item.title} className="h-full w-full object-contain rounded-xl" />
												) : (
													<ShoppingCart className="h-6 w-6 text-[#718096]" />
												)}
											</div>

											{/* Details */}
											<div className="flex-1 min-w-0">
												<h4 className="text-xs font-bold text-[#2D3748] truncate mb-0.5" title={item.title}>
													{item.title}
												</h4>
												<p className="text-[11px] font-semibold text-[#718096] mb-2">
													{item.variantLabel || '1kg'} • Rs. {item.unitPrice?.toLocaleString()}
												</p>

												{/* Quantity Stepper & Price */}
												<div className="flex items-center justify-between">
													<div className="inline-flex items-center rounded-xl border border-[#E2E8F0] bg-slate-50 p-0.5">
														<button
															onClick={() => handleQtyChange(item.id, item.productId, item.variantId, Math.max(1, item.quantity - 1))}
															className="h-6 w-6 rounded-lg bg-white shadow-2xs hover:bg-[#F5EFE0] text-[#2D3748] flex items-center justify-center transition-colors active:scale-90"
															aria-label="Decrease quantity"
														>
															<Minus className="h-3 w-3 stroke-[2.5]" />
														</button>
														<span className="w-8 text-center text-xs font-extrabold text-[#2D3748]">
															{item.quantity}
														</span>
														<button
															onClick={() => handleQtyChange(item.id, item.productId, item.variantId, item.quantity + 1)}
															className="h-6 w-6 rounded-lg bg-white shadow-2xs hover:bg-[#F5EFE0] text-[#2D3748] flex items-center justify-center transition-colors active:scale-90"
															aria-label="Increase quantity"
														>
															<Plus className="h-3 w-3 stroke-[2.5]" />
														</button>
													</div>

													<div className="flex items-center gap-2.5">
														<span className="text-xs font-extrabold text-[#2D3748]">
															Rs. {itemTotal.toLocaleString()}
														</span>
														<button
															onClick={() => handleRemove(item.id, item.productId, item.variantId)}
															className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
															aria-label="Remove item"
														>
															<Trash2 className="h-3.5 w-3.5" />
														</button>
													</div>
												</div>
											</div>
										</div>
									)
								})
							)}
						</div>

						{/* Footer / Checkout CTA */}
						{items.length > 0 && (
							<div className="p-4 sm:p-5 bg-slate-50 border-t border-[#E2E8F0] space-y-3">
								<div className="space-y-1.5">
									<div className="flex items-center justify-between text-xs text-[#718096]">
										<span>Subtotal</span>
										<span className="font-semibold text-[#2D3748]">Rs. {subtotal.toLocaleString()}</span>
									</div>
									<div className="flex items-center justify-between text-xs text-[#718096]">
										<span>Estimated Delivery</span>
										<span className="font-semibold text-[#2D3748]">
											{subtotal >= FREE_DELIVERY_THRESHOLD ? (
												<span className="text-[#7EB338] font-bold">FREE</span>
											) : (
												'Rs. 200'
											)}
										</span>
									</div>
									<div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
										<span className="text-sm font-extrabold text-[#2D3748]">Total Amount</span>
										<span className="text-base font-black text-[#7EB338]">
											Rs. {(subtotal + (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : 200)).toLocaleString()}
										</span>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-2 pt-1">
									<Link
										href="/cart"
										onClick={handleClose}
										className="flex items-center justify-center py-3 rounded-2xl border border-[#E2E8F0] bg-white hover:bg-slate-100 text-xs font-bold text-[#2D3748] transition-colors"
									>
										View Cart
									</Link>
									<Link
										href="/checkout"
										onClick={handleClose}
										className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#7EB338] hover:bg-[#6fa02f] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
									>
										<span>Checkout</span>
										<ArrowRight className="h-3.5 w-3.5" />
									</Link>
								</div>
							</div>
						)}
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	)
}
