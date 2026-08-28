"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
	Search,
	Package,
	Truck,
	CheckCircle,
	XCircle,
	Clock,
	MapPin,
	Phone,
	ArrowRight,
	ShoppingBag,
	RotateCcw,
	HelpCircle,
	CheckCircle2
} from 'lucide-react'
import { formatCurrencyPKR } from '@/app/lib/price'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

interface OrderItem {
	_id?: string
	productId: string
	variantId?: string
	quantity: number
	unitPrice: number
	title?: string
	variantLabel?: string
	image?: string
}

interface Order {
	_id: string
	userId?: string
	status: OrderStatus
	paymentMethod: 'COD' | 'JAZZCASH' | 'EASYPAISA' | 'OTHER'
	totalAmount: number
	deliveryFee: number
	shippingName: string
	shippingPhone: string
	shippingAddress: string
	city: string
	paymentReference?: string
	items: OrderItem[]
	createdAt: string
	updatedAt: string
}

function OrdersTrackerContent() {
	const searchParams = useSearchParams()
	const { status: authStatus } = useSession()
	const paramId = searchParams.get('id') || ''

	const [orderId, setOrderId] = useState(paramId)
	const [phone, setPhone] = useState('')
	const [loading, setLoading] = useState(false)
	const [order, setOrder] = useState<Order | null>(null)
	const [error, setError] = useState('')
	const [searchMethod, setSearchMethod] = useState<'id' | 'phone'>('id')
	const [userOrders, setUserOrders] = useState<Order[]>([])
	const [loadingUserOrders, setLoadingUserOrders] = useState(false)

	// Fetch single order by ID or phone
	async function fetchOrderData(queryId?: string, queryPhone?: string) {
		const targetId = queryId || orderId.trim()
		const targetPhone = queryPhone || phone.trim()

		if (searchMethod === 'id' && !targetId) {
			setError('Please enter your Order ID')
			return
		}
		if (searchMethod === 'phone' && !targetPhone) {
			setError('Please enter your phone number')
			return
		}

		setLoading(true)
		setError('')

		try {
			let url = ''
			if (searchMethod === 'id' || queryId) {
				url = `/api/orders/${targetId}`
			} else {
				url = `/api/orders?phone=${encodeURIComponent(targetPhone)}`
			}

			const res = await fetch(url, { cache: 'no-store' })
			const json = await res.json()

			if (!res.ok || !json?.success) {
				setError(json?.message || 'Order not found. Please check your order ID or phone number.')
				setOrder(null)
			} else {
				const data = json.data
				if (Array.isArray(data)) {
					if (data.length === 0) {
						setError('No orders found with this phone number.')
						setOrder(null)
					} else {
						setOrder(data[0])
					}
				} else {
					setOrder(data)
				}
			}
		} catch (err: any) {
			setError('Failed to fetch order details. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	// Auto-fetch if ID param in URL
	useEffect(() => {
		if (paramId) {
			setOrderId(paramId)
			setSearchMethod('id')
			fetchOrderData(paramId)
		}
	}, [paramId])

	// If authenticated and no order selected, load user orders
	useEffect(() => {
		if (authStatus === 'authenticated' && !paramId) {
			setLoadingUserOrders(true)
			fetch('/api/orders', { cache: 'no-store' })
				.then((res) => res.json())
				.then((json) => {
					if (json.success && Array.isArray(json.data)) {
						setUserOrders(json.data)
					}
				})
				.catch(() => {})
				.finally(() => setLoadingUserOrders(false))
		}
	}, [authStatus, paramId])

	const getStatusLabel = (status: OrderStatus) => {
		switch (status) {
			case 'PENDING':
				return 'Order Received & Confirmed'
			case 'PROCESSING':
				return 'Fresh Milling & Packing'
			case 'SHIPPED':
				return 'Out for Delivery'
			case 'DELIVERED':
				return 'Delivered'
			case 'CANCELLED':
				return 'Cancelled'
			default:
				return status
		}
	}

	const getStatusBadge = (status: OrderStatus) => {
		switch (status) {
			case 'PENDING':
				return 'bg-amber-100 text-amber-800 border-amber-200'
			case 'PROCESSING':
				return 'bg-blue-100 text-blue-800 border-blue-200'
			case 'SHIPPED':
				return 'bg-purple-100 text-purple-800 border-purple-200'
			case 'DELIVERED':
				return 'bg-emerald-100 text-emerald-800 border-emerald-200'
			case 'CANCELLED':
				return 'bg-red-100 text-red-800 border-red-200'
			default:
				return 'bg-slate-100 text-slate-800 border-slate-200'
		}
	}

	return (
		<div className="min-h-screen bg-slate-50/60 py-6 sm:py-10 pb-20 md:pb-16">
			<div className="container-pg max-w-4xl mx-auto space-y-6">
				{/* Breadcrumb & Heading */}
				<div className="text-center space-y-2 mb-4 sm:mb-8">
					<div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#718096]">
						<Link href="/" className="hover:text-[#7EB338] transition-colors">Home</Link>
						<span>/</span>
						<span className="text-[#2D3748]">Track Orders</span>
					</div>
					<h1 className="text-2xl sm:text-4xl font-black text-[#2D3748] tracking-tight">
						Track Your Order
					</h1>
					<p className="text-xs sm:text-sm text-[#718096] max-w-md mx-auto">
						Check real-time preparation, milling, and delivery status of your wholesale groceries.
					</p>
				</div>

				{/* Search Box */}
				<div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-4">
					<div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 w-fit">
						<button
							type="button"
							onClick={() => {
								setSearchMethod('id')
								setError('')
							}}
							className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
								searchMethod === 'id'
									? 'bg-white text-[#2D3748] shadow-xs'
									: 'text-[#718096] hover:text-[#2D3748]'
							}`}
						>
							Search by Order ID
						</button>
						<button
							type="button"
							onClick={() => {
								setSearchMethod('phone')
								setError('')
							}}
							className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
								searchMethod === 'phone'
									? 'bg-white text-[#2D3748] shadow-xs'
									: 'text-[#718096] hover:text-[#2D3748]'
							}`}
						>
							Search by Phone Number
						</button>
					</div>

					<form
						onSubmit={(e) => {
							e.preventDefault()
							fetchOrderData()
						}}
						className="flex flex-col sm:flex-row items-center gap-2.5"
					>
						<div className="relative flex-1 w-full">
							{searchMethod === 'id' ? (
								<input
									type="text"
									value={orderId}
									onChange={(e) => setOrderId(e.target.value)}
									placeholder="Enter your Order Reference ID (e.g., 65f...)"
									className="w-full rounded-2xl border border-[#E2E8F0] bg-slate-50 px-4 py-3.5 pl-11 text-xs font-bold text-[#2D3748] placeholder-[#718096] focus:bg-white focus:border-[#7EB338] focus:outline-none"
								/>
							) : (
								<input
									type="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="Enter your registered phone (e.g., 03001234567)"
									className="w-full rounded-2xl border border-[#E2E8F0] bg-slate-50 px-4 py-3.5 pl-11 text-xs font-bold text-[#2D3748] placeholder-[#718096] focus:bg-white focus:border-[#7EB338] focus:outline-none"
								/>
							)}
							<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#7EB338] hover:bg-[#6fa02f] text-white text-xs font-black shadow-md hover:shadow-lg transition-all disabled:opacity-50"
						>
							{loading ? 'Tracking...' : 'Track Order'}
						</button>
					</form>

					{error && (
						<div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
							{error}
						</div>
					)}
				</div>

				{/* Single Order Details Card */}
				{order && (
					<div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-sm space-y-6">
						{/* Header */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
							<div>
								<span className="text-[11px] font-bold text-[#718096] uppercase tracking-wider block mb-1">
									Order Details
								</span>
								<h2 className="text-xl font-black text-[#2D3748] select-all">
									ID: {order._id}
								</h2>
								<p className="text-xs text-[#718096] mt-0.5">
									Placed on {new Date(order.createdAt).toLocaleDateString('en-PK', {
										year: 'numeric',
										month: 'short',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</p>
							</div>

							<span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold border ${getStatusBadge(order.status)} self-start sm:self-auto shadow-2xs`}>
								<Clock className="h-3.5 w-3.5" />
								<span>{getStatusLabel(order.status)}</span>
							</span>
						</div>

						{/* Tracking Steps Visual */}
						<div className="p-5 rounded-2xl bg-[#F5EFE0]/60 border border-[#E2E8F0]">
							<div className="flex items-center justify-between text-xs font-black text-[#2D3748] mb-3">
								<span>Order Status Timeline</span>
								<span className="text-[#7EB338]">{getStatusLabel(order.status)}</span>
							</div>
							<div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-[#718096]">
								<div className={`p-2 rounded-xl ${order.status !== 'CANCELLED' ? 'bg-[#7EB338] text-white' : 'bg-slate-200'}`}>
									1. Confirmed
								</div>
								<div className={`p-2 rounded-xl ${['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) ? 'bg-[#7EB338] text-white' : 'bg-slate-200 text-slate-500'}`}>
									2. Packing
								</div>
								<div className={`p-2 rounded-xl ${['SHIPPED', 'DELIVERED'].includes(order.status) ? 'bg-[#7EB338] text-white' : 'bg-slate-200 text-slate-500'}`}>
									3. On Delivery
								</div>
								<div className={`p-2 rounded-xl ${order.status === 'DELIVERED' ? 'bg-[#7EB338] text-white' : 'bg-slate-200 text-slate-500'}`}>
									4. Delivered
								</div>
							</div>
						</div>

						{/* Ordered Items List */}
						<div>
							<h3 className="text-xs font-black text-[#2D3748] uppercase tracking-wider mb-3">
								Items Ordered ({order.items.reduce((s, i) => s + (i.quantity || 1), 0)})
							</h3>
							<div className="divide-y divide-[#E2E8F0] rounded-2xl border border-[#E2E8F0] overflow-hidden">
								{order.items.map((item, idx) => (
									<div key={item._id || idx} className="p-4 flex items-center justify-between gap-3 bg-white">
										<div className="flex items-center gap-3 min-w-0">
											<div className="h-14 w-14 rounded-xl bg-slate-50 border border-[#E2E8F0] p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
												{item.image ? (
													<img src={item.image} alt={item.title || 'Product'} className="h-full w-full object-contain rounded-lg" />
												) : (
													<Package className="h-6 w-6 text-[#718096]" />
												)}
											</div>
											<div className="min-w-0">
												<h4 className="text-xs font-bold text-[#2D3748] truncate">{item.title || 'Wholesale Groceries'}</h4>
												<p className="text-[11px] text-[#718096]">
													{item.variantLabel || '1kg'} • Qty: {item.quantity} × Rs. {item.unitPrice?.toLocaleString()}
												</p>
											</div>
										</div>
										<div className="text-xs font-black text-[#2D3748] text-right flex-shrink-0">
											Rs. {(item.unitPrice * item.quantity).toLocaleString()}
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Shipping & Payment Grids */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Delivery Info */}
							<div className="p-4 rounded-2xl border border-[#E2E8F0] bg-slate-50 space-y-2">
								<h4 className="text-xs font-extrabold text-[#2D3748] flex items-center gap-1.5 uppercase tracking-wider">
									<MapPin className="h-3.5 w-3.5 text-[#7EB338]" />
									<span>Delivery Destination</span>
								</h4>
								<div className="text-xs text-[#718096] space-y-1">
									<p><strong className="text-[#2D3748]">Recipient:</strong> {order.shippingName}</p>
									<p><strong className="text-[#2D3748]">Phone:</strong> {order.shippingPhone}</p>
									<p><strong className="text-[#2D3748]">Address:</strong> {order.shippingAddress}, {order.city}</p>
								</div>
							</div>

							{/* Payment Breakdown */}
							<div className="p-4 rounded-2xl border border-[#E2E8F0] bg-slate-50 space-y-2">
								<h4 className="text-xs font-extrabold text-[#2D3748] flex items-center gap-1.5 uppercase tracking-wider">
									<Package className="h-3.5 w-3.5 text-[#7EB338]" />
									<span>Payment Breakdown</span>
								</h4>
								<div className="text-xs space-y-1.5">
									<div className="flex justify-between text-[#718096]">
										<span>Method:</span>
										<strong className="text-[#2D3748]">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}</strong>
									</div>
									<div className="flex justify-between text-[#718096]">
										<span>Subtotal:</span>
										<strong className="text-[#2D3748]">Rs. {(order.totalAmount - order.deliveryFee).toLocaleString()}</strong>
									</div>
									<div className="flex justify-between text-[#718096]">
										<span>Delivery:</span>
										<strong className="text-[#2D3748]">Rs. {order.deliveryFee.toLocaleString()}</strong>
									</div>
									<div className="pt-1.5 border-t border-[#E2E8F0] flex justify-between font-black text-sm">
										<span className="text-[#2D3748]">Grand Total:</span>
										<span className="text-[#7EB338]">Rs. {order.totalAmount.toLocaleString()}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Authenticated Recent Orders List (if not searching single order) */}
				{!order && userOrders.length > 0 && (
					<div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-4">
						<h2 className="text-base font-black text-[#2D3748] pb-3 border-b border-[#E2E8F0]">
							Your Recent Orders ({userOrders.length})
						</h2>

						<div className="divide-y divide-[#E2E8F0]">
							{userOrders.map((o) => (
								<div key={o._id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
									<div>
										<div className="flex items-center gap-2">
											<span className="text-xs font-black text-[#2D3748]">Order #{o._id}</span>
											<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(o.status)}`}>
												{getStatusLabel(o.status)}
											</span>
										</div>
										<p className="text-[11px] text-[#718096] mt-0.5">
											{new Date(o.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })} • Total: Rs. {o.totalAmount.toLocaleString()}
										</p>
									</div>

									<button
										onClick={() => {
											setOrderId(o._id)
											setSearchMethod('id')
											fetchOrderData(o._id)
										}}
										className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-[#F5EFE0] hover:text-[#7EB338] text-xs font-bold text-[#2D3748] transition-colors self-start sm:self-auto"
									>
										View Details &rarr;
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Support Card */}
				<div className="rounded-3xl bg-[#F5EFE0]/70 border border-[#E2E8F0] p-6 text-center space-y-3">
					<HelpCircle className="h-6 w-6 text-[#7EB338] mx-auto" />
					<h3 className="text-sm font-bold text-[#2D3748]">Need Help with Your Order?</h3>
					<p className="text-xs text-[#718096] max-w-sm mx-auto">
						Contact our 24/7 customer helpline or message us directly on WhatsApp.
					</p>
					<div className="flex items-center justify-center gap-3 pt-1">
						<Link
							href="/contact"
							className="px-5 py-2 rounded-full bg-[#2D3748] hover:bg-[#1a202c] text-white text-xs font-bold transition-all"
						>
							Contact Support
						</Link>
						<Link
							href="/products"
							className="px-5 py-2 rounded-full bg-[#7EB338] hover:bg-[#6fa02f] text-white text-xs font-bold shadow-sm transition-all"
						>
							Shop More Products
						</Link>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function TrackOrderPage() {
	return (
		<Suspense fallback={<div className="container-pg py-12 text-center text-xs text-[#718096]">Loading Order Tracker...</div>}>
			<OrdersTrackerContent />
		</Suspense>
	)
}
