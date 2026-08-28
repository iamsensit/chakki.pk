"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useCartStore, cartTotal } from '@/store/cart'
import { formatCurrencyPKR } from '@/app/lib/price'
import {
	Minus,
	Plus,
	Trash2,
	ShoppingCart,
	ArrowRight,
	ArrowLeft,
	ShieldCheck,
	Truck,
	Sparkles,
	Tag,
	RotateCcw,
	CheckCircle2
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

const FREE_DELIVERY_THRESHOLD = 2000

export default function CartPage() {
	const { items, updateQty, remove, clear } = useCartStore()
	const subtotal = cartTotal(items)
	const { status } = useSession()
	const [promoCode, setPromoCode] = useState('')
	const [promoApplied, setPromoApplied] = useState(false)
	const [promoDiscount, setPromoDiscount] = useState(0)

	const totalItemsCount = items.reduce((acc, i) => acc + i.quantity, 0)
	const isFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD
	const deliveryFee = items.length === 0 ? 0 : isFreeDelivery ? 0 : 200
	const freeDeliveryProgress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100))
	const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)
	const grandTotal = Math.max(0, subtotal + deliveryFee - promoDiscount)

	async function handleRemove(id: string, productId: string, variantId?: string, title?: string) {
		remove(id)
		if (status === 'authenticated') {
			try {
				const params = new URLSearchParams()
				params.set('productId', productId)
				if (variantId) params.set('variantId', variantId)
				await fetch(`/api/cart?${params.toString()}`, { method: 'DELETE' })
			} catch {}
		}
		toast.success(`Removed ${title || 'item'} from cart`)
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

	function handleApplyPromo(e: React.FormEvent) {
		e.preventDefault()
		if (!promoCode.trim()) return

		if (promoCode.trim().toUpperCase() === 'CHAKKI10' || promoCode.trim().toUpperCase() === 'WELCOME') {
			const disc = Math.round(subtotal * 0.1)
			setPromoDiscount(disc)
			setPromoApplied(true)
			toast.success('Promo code applied! 10% Discount')
		} else if (promoCode.trim().toUpperCase() === 'FREESHIP') {
			setPromoDiscount(deliveryFee)
			setPromoApplied(true)
			toast.success('Promo code applied! Free Shipping')
		} else {
			toast.error('Invalid promo code')
		}
	}

	return (
		<div className="bg-slate-50/60 min-h-screen pb-20 md:pb-16 pt-4 sm:pt-8">
			<div className="container-pg">
				{/* Breadcrumbs & Header */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-[#E2E8F0] mb-6 sm:mb-8">
					<div>
						<div className="flex items-center gap-2 text-xs font-semibold text-[#718096] mb-1">
							<Link href="/" className="hover:text-[#7EB338] transition-colors">Home</Link>
							<span>/</span>
							<span className="text-[#2D3748]">Shopping Cart</span>
						</div>
						<h1 className="text-2xl sm:text-3xl font-black text-[#2D3748] tracking-tight flex items-center gap-2.5">
							<span>Your Shopping Bag</span>
							{totalItemsCount > 0 && (
								<span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#7EB338]/15 text-[#7EB338]">
									{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
								</span>
							)}
						</h1>
					</div>

					{items.length > 0 && (
						<button
							onClick={() => {
								clear()
								toast.info('Cart cleared')
							}}
							className="inline-flex items-center gap-1.5 text-xs font-bold text-[#718096] hover:text-rose-600 transition-colors self-start sm:self-auto"
						>
							<RotateCcw className="h-3.5 w-3.5" />
							<span>Clear All Items</span>
						</button>
					)}
				</div>

				{items.length === 0 ? (
					/* Empty Cart Card */
					<div className="max-w-xl mx-auto my-8 bg-white rounded-3xl border border-[#E2E8F0] p-8 sm:p-12 text-center shadow-xs">
						<div className="h-20 w-20 rounded-full bg-[#F5EFE0] text-[#7EB338] mx-auto flex items-center justify-center mb-5 shadow-xs">
							<ShoppingCart className="h-10 w-10" />
						</div>
						<h2 className="text-xl sm:text-2xl font-black text-[#2D3748] mb-2">Your Bag is Empty</h2>
						<p className="text-xs sm:text-sm text-[#718096] max-w-sm mx-auto mb-6">
							You haven&apos;t added any stone-ground flours, whole grains, or fresh essentials yet.
						</p>
						<Link
							href="/products"
							className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#7EB338] hover:bg-[#6fa02f] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
						>
							<span>Explore Fresh Products</span>
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				) : (
					/* 2-Column Cart Grid */
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
						{/* Left Column: Cart Items & Free Delivery Progress */}
						<div className="lg:col-span-8 space-y-4 sm:space-y-6">
							{/* Free Delivery Bar */}
							<div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs">
								<div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#2D3748] mb-2">
									<div className="flex items-center gap-2">
										<div className="p-1.5 rounded-lg bg-[#7EB338]/10 text-[#7EB338]">
											<Truck className="h-4 w-4" />
										</div>
										{isFreeDelivery ? (
											<span className="text-[#7EB338]">Congratulations! You unlocked FREE Delivery! 🎉</span>
										) : (
											<span>
												Add <strong className="text-[#F08C38]">Rs. {remainingForFreeDelivery.toLocaleString()}</strong> more to get <strong className="text-[#7EB338]">FREE Delivery</strong>
											</span>
										)}
									</div>
									<span className="text-xs font-extrabold text-[#718096]">{freeDeliveryProgress}%</span>
								</div>
								<div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
									<div
										className="h-full bg-[#7EB338] rounded-full transition-all duration-500"
										style={{ width: `${freeDeliveryProgress}%` }}
									/>
								</div>
							</div>

							{/* Items Container */}
							<div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs divide-y divide-[#E2E8F0] overflow-hidden">
								{items.map((item) => {
									const itemTotal = (item.unitPrice || 0) * (item.quantity || 1)
									return (
										<div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:bg-[#F5EFE0]/20 transition-colors">
											{/* Item Info & Thumbnail */}
											<div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
												<div className="relative h-18 w-18 sm:h-22 sm:w-22 rounded-2xl bg-slate-50 border border-[#E2E8F0] p-2 flex-shrink-0 flex items-center justify-center overflow-hidden">
													{item.image ? (
														<img src={item.image} alt={item.title} className="h-full w-full object-contain rounded-xl" />
													) : (
														<ShoppingCart className="h-8 w-8 text-[#718096]" />
													)}
												</div>

												<div className="min-w-0 flex-1">
													<Link href={`/products/${item.productId}` as any} className="hover:underline">
														<h3 className="text-sm sm:text-base font-extrabold text-[#2D3748] truncate mb-1">
															{item.title}
														</h3>
													</Link>
													<div className="flex items-center gap-2 text-xs font-semibold text-[#718096] mb-2">
														<span className="px-2 py-0.5 rounded-md bg-slate-100 text-[#2D3748]">
															{item.variantLabel || '1kg pack'}
														</span>
														<span>•</span>
														<span>Rs. {item.unitPrice?.toLocaleString()} each</span>
													</div>
													<div className="sm:hidden text-sm font-black text-[#2D3748]">
														Rs. {itemTotal.toLocaleString()}
													</div>
												</div>
											</div>

											{/* Stepper & Total */}
											<div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E8F0]">
												{/* Stepper */}
												<div className="inline-flex items-center rounded-xl border border-[#E2E8F0] bg-slate-50 p-1 shadow-2xs">
													<button
														onClick={() => handleQtyChange(item.id, item.productId, item.variantId, Math.max(1, item.quantity - 1))}
														className="h-7 w-7 rounded-lg bg-white shadow-2xs hover:bg-[#F5EFE0] text-[#2D3748] flex items-center justify-center transition-all active:scale-90"
														aria-label="Decrease quantity"
													>
														<Minus className="h-3.5 w-3.5 stroke-[2.5]" />
													</button>
													<span className="w-9 text-center text-xs sm:text-sm font-black text-[#2D3748]">
														{item.quantity}
													</span>
													<button
														onClick={() => handleQtyChange(item.id, item.productId, item.variantId, item.quantity + 1)}
														className="h-7 w-7 rounded-lg bg-white shadow-2xs hover:bg-[#F5EFE0] text-[#2D3748] flex items-center justify-center transition-all active:scale-90"
														aria-label="Increase quantity"
													>
														<Plus className="h-3.5 w-3.5 stroke-[2.5]" />
													</button>
												</div>

												{/* Row Total (Desktop) */}
												<div className="hidden sm:block text-right min-w-[90px]">
													<div className="text-base font-black text-[#2D3748]">
														Rs. {itemTotal.toLocaleString()}
													</div>
												</div>

												{/* Trash Button */}
												<button
													onClick={() => handleRemove(item.id, item.productId, item.variantId, item.title)}
													className="p-2 rounded-xl text-[#718096] hover:text-rose-600 hover:bg-rose-50 transition-colors"
													title="Remove item"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</div>
									)
								})}
							</div>

							{/* Bottom Action Bar */}
							<div className="flex items-center justify-between pt-2">
								<Link
									href="/products"
									className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#7EB338] hover:text-[#6fa02f] transition-colors"
								>
									<ArrowLeft className="h-4 w-4" />
									<span>Continue Shopping</span>
								</Link>
							</div>

							{/* Trust Perks Banner */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
								<div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#E2E8F0]">
									<div className="p-2 rounded-xl bg-[#7EB338]/10 text-[#7EB338] flex-shrink-0">
										<ShieldCheck className="h-4 w-4" />
									</div>
									<div>
										<p className="text-xs font-bold text-[#2D3748]">100% Pure & Fresh</p>
										<p className="text-[10px] text-[#718096]">Direct from Chakki mills</p>
									</div>
								</div>

								<div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#E2E8F0]">
									<div className="p-2 rounded-xl bg-[#F08C38]/10 text-[#F08C38] flex-shrink-0">
										<Truck className="h-4 w-4" />
									</div>
									<div>
										<p className="text-xs font-bold text-[#2D3748]">Fast Delivery</p>
										<p className="text-[10px] text-[#718096]">Doorstep delivery in 30 mins</p>
									</div>
								</div>

								<div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#E2E8F0]">
									<div className="p-2 rounded-xl bg-[#7EB338]/10 text-[#7EB338] flex-shrink-0">
										<CheckCircle2 className="h-4 w-4" />
									</div>
									<div>
										<p className="text-xs font-bold text-[#2D3748]">Cash on Delivery</p>
										<p className="text-[10px] text-[#718096]">Pay upon delivery at door</p>
									</div>
								</div>
							</div>
						</div>

						{/* Right Column: Order Summary Card */}
						<div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
							<div className="bg-[#F5EFE0]/60 rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-sm space-y-5">
								<h2 className="text-lg font-black text-[#2D3748] tracking-tight pb-3 border-b border-[#E2E8F0]">
									Order Summary
								</h2>

								{/* Cost Breakdown */}
								<div className="space-y-3 text-xs sm:text-sm">
									<div className="flex items-center justify-between text-[#718096]">
										<span>Items Subtotal</span>
										<span className="font-bold text-[#2D3748]">Rs. {subtotal.toLocaleString()}</span>
									</div>

									<div className="flex items-center justify-between text-[#718096]">
										<span className="flex items-center gap-1">
											<span>Delivery Fee</span>
											{isFreeDelivery && <span className="text-[10px] text-[#7EB338] font-bold">(Free Promo)</span>}
										</span>
										<span className="font-bold text-[#2D3748]">
											{isFreeDelivery ? (
												<span className="text-[#7EB338]">FREE</span>
											) : (
												`Rs. ${deliveryFee}`
											)}
										</span>
									</div>

									{promoApplied && promoDiscount > 0 && (
										<div className="flex items-center justify-between text-[#7EB338] font-bold">
											<span>Voucher Discount</span>
											<span>-Rs. {promoDiscount.toLocaleString()}</span>
										</div>
									)}

									<div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
										<div>
											<span className="text-base font-black text-[#2D3748]">Grand Total</span>
											<p className="text-[10px] text-[#718096]">Inclusive of all taxes</p>
										</div>
										<span className="text-xl font-black text-[#7EB338]">
											Rs. {grandTotal.toLocaleString()}
										</span>
									</div>
								</div>

								{/* Promo Voucher Box */}
								<form onSubmit={handleApplyPromo} className="pt-2">
									<label className="text-[11px] font-bold text-[#2D3748] uppercase tracking-wider block mb-1.5">
										Promo Code / Coupon
									</label>
									<div className="flex items-center gap-2">
										<div className="relative flex-1">
											<input
												type="text"
												value={promoCode}
												onChange={(e) => setPromoCode(e.target.value)}
												placeholder="Try CHAKKI10"
												disabled={promoApplied}
												className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs uppercase font-bold text-[#2D3748] placeholder-[#718096] focus:border-[#7EB338] focus:outline-none disabled:bg-slate-100"
											/>
											<Tag className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#718096] pointer-events-none" />
										</div>
										<button
											type="submit"
											disabled={promoApplied || !promoCode.trim()}
											className="px-4 py-2 rounded-xl bg-[#2D3748] hover:bg-[#1a202c] text-white text-xs font-bold transition-colors disabled:opacity-50"
										>
											{promoApplied ? 'Applied' : 'Apply'}
										</button>
									</div>
								</form>

								{/* Checkout CTA Button */}
								<Link
									href="/checkout"
									className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#7EB338] hover:bg-[#6fa02f] text-white text-sm font-black shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center tracking-wide"
								>
									<span>Proceed to Checkout</span>
									<ArrowRight className="h-4 w-4" />
								</Link>

								{/* Security text */}
								<p className="text-[11px] text-[#718096] text-center flex items-center justify-center gap-1">
									<ShieldCheck className="h-3.5 w-3.5 text-[#7EB338]" />
									<span>Guaranteed Safe & Secure Checkout</span>
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
