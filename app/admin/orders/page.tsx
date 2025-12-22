"use client"

import useSWR from 'swr'
import { useState, useMemo, useRef } from 'react'
import { CheckCircle2, Truck, BadgeCheck, Search, X, Eye, ChevronDown, ChevronUp, Package, User, Phone, MapPin, Calendar, DollarSign, Mail, Send, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrencyPKR } from '@/app/lib/price'
import { motion, AnimatePresence } from 'framer-motion'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type OrderTab = 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered'

const CANCELLATION_REASONS = [
	{ value: 'not_paid', label: 'Payment Not Received', emailSubject: 'Order Cancelled - Payment Not Received' },
	{ value: 'not_received', label: 'Payment Not Received/Verified', emailSubject: 'Order Cancelled - Payment Not Verified' },
	{ value: 'customer_request', label: 'Customer Request', emailSubject: 'Order Cancelled - Customer Request' },
	{ value: 'out_of_stock', label: 'Product Out of Stock', emailSubject: 'Order Cancelled - Product Out of Stock' },
	{ value: 'invalid_address', label: 'Invalid Delivery Address', emailSubject: 'Order Cancelled - Invalid Address' },
	{ value: 'other', label: 'Other', emailSubject: 'Order Cancelled' }
]

export default function AdminOrdersPage() {
	const { data, mutate, isLoading } = useSWR('/api/orders', fetcher)
	const [busy, setBusy] = useState<string>('')
	const [preview, setPreview] = useState<string>('')
	const [searchQuery, setSearchQuery] = useState('')
	const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
	const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
	const [cancelReason, setCancelReason] = useState('')
	const [cancelReasonType, setCancelReasonType] = useState('')
	const [cancelCustomReason, setCancelCustomReason] = useState('')
	const [activeTab, setActiveTab] = useState<OrderTab>('all')
	const [orderDetails, setOrderDetails] = useState<any>(null)
	const [orderDetailsLoading, setOrderDetailsLoading] = useState(false)
	const [productDetails, setProductDetails] = useState<Record<string, any>>({})
	const orders = data?.data || []
	
	const pendingSectionRef = useRef<HTMLDivElement>(null)
	const confirmedSectionRef = useRef<HTMLDivElement>(null)
	const shippedSectionRef = useRef<HTMLDivElement>(null)
	const deliveredSectionRef = useRef<HTMLDivElement>(null)
	
	const scrollToSection = (section: OrderTab) => {
		setActiveTab(section)
		setTimeout(() => {
			let ref: HTMLDivElement | null = null
			if (section === 'pending') ref = pendingSectionRef.current
			else if (section === 'confirmed') ref = confirmedSectionRef.current
			else if (section === 'shipped') ref = shippedSectionRef.current
			else if (section === 'delivered') ref = deliveredSectionRef.current
			
			if (ref) {
				ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
			}
		}, 100)
	}
	
	// Separate orders by status
	const { pendingOrders, confirmedOrders, shippedOrders, deliveredOrders } = useMemo(() => {
		const pending = orders.filter((o: any) => String(o.status || '').toUpperCase() === 'PENDING')
		const confirmed = orders.filter((o: any) => String(o.status || '').toUpperCase() === 'CONFIRMED')
		const shipped = orders.filter((o: any) => String(o.status || '').toUpperCase() === 'SHIPPED')
		const delivered = orders.filter((o: any) => String(o.status || '').toUpperCase() === 'DELIVERED')
		return { pendingOrders: pending, confirmedOrders: confirmed, shippedOrders: shipped, deliveredOrders: delivered }
	}, [orders])
	
	async function loadOrderDetails(order: any) {
		setOrderDetailsLoading(true)
		setOrderDetails(order)
		
		// Load product details for each item
		const productIds = order.items?.map((item: any) => item.productId).filter(Boolean) || []
		const uniqueProductIds = [...new Set(productIds)]
		
		const details: Record<string, any> = {}
		await Promise.all(
			uniqueProductIds.map(async (productId: any) => {
				try {
					const res = await fetch(`/api/products/${String(productId)}`)
					const json = await res.json()
					if (json?.success && json?.data) {
						details[String(productId)] = json.data
					}
				} catch (error) {
					console.error('Failed to load product:', productId, error)
				}
			})
		)
		setProductDetails(details)
		setOrderDetailsLoading(false)
	}
	
	async function sendOrderDetailsEmail(orderId: string) {
		setBusy(orderId)
		try {
			const res = await fetch(`/api/orders/${orderId}/send-details`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			})
			
			const json = await res.json()
			
			if (!res.ok || !json.success) {
				throw new Error(json.message || 'Failed to send email')
			}
			
			toast.success('Order details email sent to customer')
		} catch (e: any) {
			console.error('Send email error:', e)
			toast.error(e.message || 'Failed to send email')
		} finally {
			setBusy('')
		}
	}

	// Filter orders based on search query
	const filterOrders = (ordersList: any[]) => {
		if (!searchQuery.trim()) return ordersList
		const query = searchQuery.toLowerCase()
		return ordersList.filter((o: any) => {
			const orderId = String(o._id).toLowerCase()
			const shippingName = (o.shippingName || '').toLowerCase()
			const shippingPhone = (o.shippingPhone || '').toLowerCase()
			const shippingAddress = (o.shippingAddress || '').toLowerCase()
			const city = (o.city || '').toLowerCase()
			return orderId.includes(query) || 
				   shippingName.includes(query) || 
				   shippingPhone.includes(query) ||
				   shippingAddress.includes(query) ||
				   city.includes(query)
		})
	}

	async function updateOrder(id: string, patch: any) {
		setBusy(id)
		try {
			const res = await fetch(`/api/orders/${id}`, { 
				method: 'PUT', 
				headers: { 'Content-Type': 'application/json' }, 
				body: JSON.stringify(patch) 
			})
			
			const json = await res.json()
			
			if (!res.ok || !json.success) {
				throw new Error(json.message || 'Failed to update')
			}
			
			toast.success('Order updated')
			await mutate()
		} catch (e: any) {
			console.error('Update order error:', e)
			toast.error(e.message || 'Update failed')
		} finally {
			setBusy('')
		}
	}

	async function handleConfirmOrder(orderId: string) {
		await updateOrder(orderId, { 
			status: 'CONFIRMED'
		})
	}

	async function handleCancelOrder() {
		if (!cancelOrderId || !cancelReasonType) {
			toast.error('Please select a cancellation reason')
			return
		}
		
		if (cancelReasonType === 'other' && !cancelCustomReason.trim()) {
			toast.error('Please provide a cancellation reason')
			return
		}
		
		const selectedReason = CANCELLATION_REASONS.find(r => r.value === cancelReasonType)
		const finalReason = cancelReasonType === 'other' ? cancelCustomReason.trim() : selectedReason?.label || ''
		
		setBusy(cancelOrderId)
		try {
			const res = await fetch(`/api/orders/${cancelOrderId}`, { 
				method: 'PUT', 
				headers: { 'Content-Type': 'application/json' }, 
				body: JSON.stringify({ 
					status: 'CANCELLED',
					cancellationReason: finalReason,
					cancellationReasonType: cancelReasonType,
					cancellationEmailSubject: selectedReason?.emailSubject || 'Order Cancelled'
				}) 
			})
			
			const json = await res.json()
			
			if (!res.ok || !json.success) {
				throw new Error(json.message || 'Failed to cancel order')
			}
			
			toast.success('Order cancelled')
			setCancelOrderId(null)
			setCancelReasonType('')
			setCancelCustomReason('')
			await mutate()
		} catch (e: any) {
			console.error('Cancel order error:', e)
			toast.error(e.message || 'Failed to cancel order')
		} finally {
			setBusy('')
		}
	}

	async function sendPaymentReminder(orderId: string) {
		setBusy(orderId)
		try {
			const res = await fetch(`/api/orders/${orderId}/remind-payment`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			})
			
			const json = await res.json()
			
			if (!res.ok || !json.success) {
				throw new Error(json.message || 'Failed to send reminder')
			}
			
			toast.success('Payment reminder sent')
		} catch (e: any) {
			console.error('Send reminder error:', e)
			toast.error(e.message || 'Failed to send reminder')
		} finally {
			setBusy('')
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'PENDING':
				return 'Awaiting Confirmation'
			case 'CONFIRMED':
				return 'Order Confirmed'
			case 'SHIPPING_IN_PROCESS':
				return 'Shipment Pending'
			case 'SHIPPED':
				return 'Shipped'
			case 'DELIVERED':
				return 'Delivered'
			case 'CANCELLED':
				return 'Cancelled'
			default:
				return status
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'CONFIRMED': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
			case 'SHIPPING_IN_PROCESS': return 'text-indigo-600 bg-indigo-50 border-indigo-200'
			case 'SHIPPED': return 'text-blue-600 bg-blue-50 border-blue-200'
			case 'DELIVERED': return 'text-green-600 bg-green-50 border-green-200'
			case 'CANCELLED': return 'text-red-600 bg-red-50 border-red-200'
			default: return 'text-amber-600 bg-amber-50 border-amber-200'
		}
	}

	function getIconColor(status: string, currentStatus: string) {
		if (status === 'CONFIRMED' && currentStatus === 'CONFIRMED') return 'text-emerald-600'
		if (status === 'SHIPPED' && currentStatus === 'SHIPPED') return 'text-blue-600'
		return 'text-slate-400'
	}

	return (
		<div className="container-pg py-8">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-slate-900 mb-2">Order Management</h1>
				<p className="text-slate-600">Manage and track all customer orders</p>
			</div>

			{/* Search Bar */}
			<div className="mb-6 relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search by order ID, name, email, phone, or address..."
					className="input-enhanced pl-10 pr-10"
				/>
				{searchQuery && (
					<button
						onClick={() => setSearchQuery('')}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
					>
						<X className="h-5 w-5" />
					</button>
				)}
			</div>

			{/* Stats - Clickable to navigate */}
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
				<div className="card-enhanced p-4">
					<div className="text-sm text-slate-600 mb-1">Total Orders</div>
					<div className="text-2xl font-bold text-slate-900">{orders.length}</div>
				</div>
				<button
					onClick={() => scrollToSection('pending')}
					className={`card-enhanced p-4 text-left hover:shadow-md transition-shadow cursor-pointer ${activeTab === 'pending' ? 'ring-2 ring-amber-500' : ''}`}
				>
					<div className="text-sm text-slate-600 mb-1">Awaiting Confirmation</div>
					<div className="text-2xl font-bold text-amber-600">
						{pendingOrders.length}
					</div>
					<div className="text-xs text-slate-500 mt-1">Payment verification pending</div>
				</button>
				<button
					onClick={() => scrollToSection('confirmed')}
					className={`card-enhanced p-4 text-left hover:shadow-md transition-shadow cursor-pointer ${activeTab === 'confirmed' ? 'ring-2 ring-emerald-500' : ''}`}
				>
					<div className="text-sm text-slate-600 mb-1">Order Confirmed</div>
					<div className="text-2xl font-bold text-emerald-600">
						{confirmedOrders.length}
					</div>
					<div className="text-xs text-slate-500 mt-1">Preparing for shipment</div>
				</button>
				<button
					onClick={() => scrollToSection('shipped')}
					className={`card-enhanced p-4 text-left hover:shadow-md transition-shadow cursor-pointer ${activeTab === 'shipped' ? 'ring-2 ring-blue-500' : ''}`}
				>
					<div className="text-sm text-slate-600 mb-1">Shipped</div>
					<div className="text-2xl font-bold text-blue-600">
						{shippedOrders.length}
					</div>
					<div className="text-xs text-slate-500 mt-1">In transit</div>
				</button>
				<div className="card-enhanced p-4">
					<div className="text-sm text-slate-600 mb-1">Total Revenue</div>
					<div className="text-2xl font-bold text-brand-accent">
						{formatCurrencyPKR(orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0))}
					</div>
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="skeleton h-32 rounded-xl" />
					))}
				</div>
			) : (
				<div className="space-y-8">
					{/* Pending Orders Section */}
					{(activeTab === 'all' || activeTab === 'pending') && (
						<div ref={pendingSectionRef} className="space-y-4">
							<h2 className="text-xl font-semibold text-slate-900 mb-2">Pending Orders ({pendingOrders.length})</h2>
							<p className="text-sm text-slate-600 mb-4">Orders awaiting admin confirmation and payment verification</p>
							{filterOrders(pendingOrders).map((o: any, idx: number) => (
						<motion.div
							key={o._id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: idx * 0.05 }}
							className="card-enhanced p-6"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<h3 className="text-lg font-semibold text-slate-900">
											Order #{String(o._id).slice(-8).toUpperCase()}
										</h3>
										<span className={`badge-status ${getStatusColor(o.status)}`} title={o.status}>
											{getStatusLabel(o.status)}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
										<div className="flex items-center gap-1.5">
											<Calendar className="h-4 w-4" />
											{new Date(o.createdAt).toLocaleDateString('en-PK', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</div>
										<div className="flex items-center gap-1.5">
											<Package className="h-4 w-4" />
											{o.items?.length || 0} items
										</div>
										<div className="flex items-center gap-1.5">
											<DollarSign className="h-4 w-4" />
											{formatCurrencyPKR(o.totalAmount)}
										</div>
										<div className="flex items-center gap-1.5">
											<span className="font-medium">{o.paymentMethod}</span>
										</div>
									</div>
								</div>
								<button
									onClick={() => {
										if (expandedOrder === o._id) {
											setExpandedOrder(null)
											setOrderDetails(null)
										} else {
											setExpandedOrder(o._id)
											loadOrderDetails(o)
										}
									}}
									className="btn-secondary p-2"
								>
									{expandedOrder === o._id ? (
										<ChevronUp className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>


							{/* Action Buttons */}
							<div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
								{o.status === 'PENDING' && (
									<button
										disabled={busy === o._id}
										onClick={() => handleConfirmOrder(o._id)}
										className="btn-primary px-4 py-2 flex items-center gap-2"
										title="Confirm order"
									>
										<CheckCircle2 className="h-4 w-4" />
										Confirm Order
									</button>
								)}
								{(o.status === 'CONFIRMED' || o.status === 'SHIPPING_IN_PROCESS') && (
									<button
										disabled={busy === o._id}
										onClick={() => updateOrder(o._id, { status: 'SHIPPED', shippedAt: new Date() })}
										className="btn-primary px-4 py-2 flex items-center gap-2"
										title="Mark as shipped"
									>
										<Truck className="h-4 w-4" />
										Ship
									</button>
								)}
								{(o.paymentMethod === 'JAZZCASH' || o.paymentMethod === 'EASYPAISA') && o.status === 'PENDING' && (
									<button
										disabled={busy === o._id}
										onClick={() => sendPaymentReminder(o._id)}
										className="btn-secondary px-4 py-2 flex items-center gap-2"
										title="Send payment reminder email"
									>
										<Mail className="h-4 w-4" />
										Payment Reminder
									</button>
								)}
								{o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
									<button
										disabled={busy === o._id}
										onClick={() => setCancelOrderId(o._id)}
										className="btn-secondary px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50"
										title="Cancel order"
									>
										<X className="h-4 w-4" />
										Cancel
									</button>
								)}
							</div>
						</motion.div>
							))}
						</div>
					)}
					
					{/* Confirmed Orders Section */}
					{(activeTab === 'all' || activeTab === 'confirmed') && filterOrders(confirmedOrders).length > 0 && (
						<div ref={confirmedSectionRef} className="space-y-4">
							<h2 className="text-xl font-semibold text-slate-900 mb-2">Confirmed Orders ({confirmedOrders.length})</h2>
							<p className="text-sm text-slate-600 mb-4">Orders confirmed and being prepared for shipment</p>
							{filterOrders(confirmedOrders).map((o: any, idx: number) => (
						<motion.div
							key={o._id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: idx * 0.05 }}
							className="card-enhanced p-6"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<h3 className="text-lg font-semibold text-slate-900">
											Order #{String(o._id).slice(-8).toUpperCase()}
										</h3>
										<span className={`badge-status ${getStatusColor(o.status)}`} title={o.status}>
											{getStatusLabel(o.status)}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
										<div className="flex items-center gap-1.5">
											<Calendar className="h-4 w-4" />
											{new Date(o.createdAt).toLocaleDateString('en-PK', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</div>
										<div className="flex items-center gap-1.5">
											<Package className="h-4 w-4" />
											{o.items?.length || 0} items
										</div>
										<div className="flex items-center gap-1.5">
											<DollarSign className="h-4 w-4" />
											{formatCurrencyPKR(o.totalAmount)}
										</div>
										<div className="flex items-center gap-1.5">
											<span className="font-medium">{o.paymentMethod}</span>
										</div>
									</div>
								</div>
								<button
									onClick={() => {
										if (expandedOrder === o._id) {
											setExpandedOrder(null)
											setOrderDetails(null)
										} else {
											setExpandedOrder(o._id)
											loadOrderDetails(o)
										}
									}}
									className="btn-secondary p-2"
								>
									{expandedOrder === o._id ? (
										<ChevronUp className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>

							{/* Action Buttons */}
							<div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
								<button
									disabled={busy === o._id || o.status === 'SHIPPED' || o.status === 'DELIVERED'}
									onClick={() => updateOrder(o._id, { status: 'SHIPPED', shippedAt: new Date() })}
									className={`btn-secondary p-2 ${getIconColor('SHIPPED', o.status)}`}
									title="Mark shipped"
								>
									<Truck className={`h-5 w-5 ${o.status === 'SHIPPED' ? 'text-blue-600' : ''}`} />
								</button>
								{o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
									<button
										disabled={busy === o._id}
										onClick={() => setCancelOrderId(o._id)}
										className="btn-secondary px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50"
										title="Cancel order"
									>
										<X className="h-4 w-4" />
										Cancel
									</button>
								)}
							</div>
						</motion.div>
							))}
						</div>
					)}
					
					{/* Shipped Orders Section */}
					{(activeTab === 'all' || activeTab === 'shipped') && filterOrders(shippedOrders).length > 0 && (
						<div ref={shippedSectionRef} className="space-y-4">
							<h2 className="text-xl font-semibold text-slate-900 mb-2">Shipped Orders ({shippedOrders.length})</h2>
							<p className="text-sm text-slate-600 mb-4">Orders that have been shipped and are in transit</p>
							{filterOrders(shippedOrders).map((o: any, idx: number) => (
						<motion.div
							key={o._id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: idx * 0.05 }}
							className="card-enhanced p-6"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<h3 className="text-lg font-semibold text-slate-900">
											Order #{String(o._id).slice(-8).toUpperCase()}
										</h3>
										<span className={`badge-status ${getStatusColor(o.status)}`} title={o.status}>
											{getStatusLabel(o.status)}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
										<div className="flex items-center gap-1.5">
											<Calendar className="h-4 w-4" />
											{new Date(o.createdAt).toLocaleDateString('en-PK', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</div>
										<div className="flex items-center gap-1.5">
											<Package className="h-4 w-4" />
											{o.items?.length || 0} items
										</div>
										<div className="flex items-center gap-1.5">
											<DollarSign className="h-4 w-4" />
											{formatCurrencyPKR(o.totalAmount)}
										</div>
										<div className="flex items-center gap-1.5">
											<span className="font-medium">{o.paymentMethod}</span>
										</div>
									</div>
								</div>
								<button
									onClick={() => {
										if (expandedOrder === o._id) {
											setExpandedOrder(null)
											setOrderDetails(null)
										} else {
											setExpandedOrder(o._id)
											loadOrderDetails(o)
										}
									}}
									className="btn-secondary p-2"
								>
									{expandedOrder === o._id ? (
										<ChevronUp className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>
							{/* Action Buttons */}
							<div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
								<button
									disabled={busy === o._id || o.status === 'DELIVERED'}
									onClick={() => updateOrder(o._id, { status: 'DELIVERED', deliveredAt: new Date() })}
									className="btn-secondary p-2 text-green-600 hover:bg-green-50"
									title="Mark delivered"
								>
									<CheckCircle2 className="h-5 w-5" />
								</button>
								{o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
									<button
										disabled={busy === o._id}
										onClick={() => setCancelOrderId(o._id)}
										className="btn-secondary px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50"
										title="Cancel order"
									>
										<X className="h-4 w-4" />
										Cancel
									</button>
								)}
							</div>
						</motion.div>
							))}
						</div>
					)}
					
					{/* Delivered Orders Section */}
					{(activeTab === 'all' || activeTab === 'delivered') && filterOrders(deliveredOrders).length > 0 && (
						<div ref={deliveredSectionRef} className="space-y-4">
							<h2 className="text-xl font-semibold text-slate-900 mb-2">Delivered Orders ({deliveredOrders.length})</h2>
							<p className="text-sm text-slate-600 mb-4">Orders that have been successfully delivered to customers</p>
							{filterOrders(deliveredOrders).map((o: any, idx: number) => (
						<motion.div
							key={o._id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: idx * 0.05 }}
							className="card-enhanced p-6"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<h3 className="text-lg font-semibold text-slate-900">
											Order #{String(o._id).slice(-8).toUpperCase()}
										</h3>
										<span className={`badge-status ${getStatusColor(o.status)}`} title={o.status}>
											{getStatusLabel(o.status)}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
										<div className="flex items-center gap-1.5">
											<Calendar className="h-4 w-4" />
											{new Date(o.createdAt).toLocaleDateString('en-PK', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</div>
										<div className="flex items-center gap-1.5">
											<Package className="h-4 w-4" />
											{o.items?.length || 0} items
										</div>
										<div className="flex items-center gap-1.5">
											<DollarSign className="h-4 w-4" />
											{formatCurrencyPKR(o.totalAmount)}
										</div>
										<div className="flex items-center gap-1.5">
											<span className="font-medium">{o.paymentMethod}</span>
										</div>
									</div>
								</div>
								<button
									onClick={() => {
										if (expandedOrder === o._id) {
											setExpandedOrder(null)
											setOrderDetails(null)
										} else {
											setExpandedOrder(o._id)
											loadOrderDetails(o)
										}
									}}
									className="btn-secondary p-2"
								>
									{expandedOrder === o._id ? (
										<ChevronUp className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>
						</motion.div>
							))}
						</div>
					)}
					
					{/* No Orders Message */}
					{activeTab !== 'all' && 
					 filterOrders(pendingOrders).length === 0 && 
					 filterOrders(confirmedOrders).length === 0 && 
					 filterOrders(shippedOrders).length === 0 && 
					 filterOrders(deliveredOrders).length === 0 && (
						<div className="card-enhanced p-12 text-center">
							<Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
							<p className="text-slate-600">
								{searchQuery ? 'No orders found matching your search.' : 'No orders in this category.'}
							</p>
						</div>
					)}
				</div>
			)}

			{/* Order Details Modal */}
			{orderDetails && expandedOrder && (
				<div
					className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
					onClick={() => {
						setExpandedOrder(null)
						setOrderDetails(null)
						setProductDetails({})
					}}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						className="max-w-4xl w-full bg-white rounded-xl p-6 max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-2xl font-bold text-slate-900">
								Order #{String(orderDetails._id).slice(-8).toUpperCase()}
							</h3>
							<button
								onClick={() => {
									setExpandedOrder(null)
									setOrderDetails(null)
									setProductDetails({})
								}}
								className="btn-secondary p-2"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						{orderDetailsLoading ? (
							<div className="text-center py-8">
								<div className="skeleton h-32 w-full" />
							</div>
						) : (
							<div className="space-y-6">
								{/* Order Status & Payment */}
								<div className="grid md:grid-cols-2 gap-4">
									<div className="p-4 bg-slate-50 rounded-lg">
										<div className="text-sm text-slate-600 mb-1">Order Status</div>
										<div className={`badge-status ${getStatusColor(orderDetails.status)}`}>
											{orderDetails.status}
										</div>
									</div>
								</div>

								{/* Customer Information */}
								<div className="grid md:grid-cols-2 gap-4">
									<div className="p-4 border rounded-lg">
										<h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
											<User className="h-4 w-4" />
											Customer Information
										</h4>
										<div className="text-sm space-y-2 text-slate-600">
											<p><span className="font-medium">Name:</span> {orderDetails.shippingName}</p>
											<p className="flex items-center gap-1.5">
												<Phone className="h-3.5 w-3.5" />
												<span>{orderDetails.shippingPhone}</span>
											</p>
										</div>
									</div>
									<div className="p-4 border rounded-lg">
										<h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
											<MapPin className="h-4 w-4" />
											Delivery Address
										</h4>
										<div className="text-sm text-slate-600">
											<p>{orderDetails.shippingAddress}</p>
											<p>{orderDetails.city}</p>
										</div>
									</div>
								</div>

								{/* Delivery Type */}
								<div className="p-4 border rounded-lg">
									<h4 className="font-semibold text-slate-900 mb-2">Delivery Information</h4>
									<div className="text-sm text-slate-600 space-y-1">
										<p><span className="font-medium">Delivery Type:</span> {orderDetails.deliveryType || 'STANDARD'}</p>
										<p><span className="font-medium">Delivery Fee:</span> {formatCurrencyPKR(orderDetails.deliveryFee || 0)}</p>
										{orderDetails.shippedAt && (
											<p><span className="font-medium">Shipped At:</span> {new Date(orderDetails.shippedAt).toLocaleString()}</p>
										)}
										{orderDetails.deliveredAt && (
											<p><span className="font-medium">Delivered At:</span> {new Date(orderDetails.deliveredAt).toLocaleString()}</p>
										)}
									</div>
								</div>

								{/* Order Items with Images */}
								<div className="p-4 border rounded-lg">
									<h4 className="font-semibold text-slate-900 mb-4">Order Items</h4>
									<div className="space-y-4">
										{orderDetails.items?.map((item: any, i: number) => {
											const product = productDetails[item.productId]
											const productImage = product?.images?.[0] || ''
											return (
												<div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
													{productImage && (
														<img
															src={productImage}
															alt={item.title || 'Product'}
															className="w-20 h-20 object-cover rounded-md"
														/>
													)}
													<div className="flex-1">
														<p className="font-medium text-slate-900">{item.title || 'Product'}</p>
														{item.variantLabel && (
															<p className="text-sm text-slate-600">Variant: {item.variantLabel}</p>
														)}
														<p className="text-sm text-slate-600 mt-1">
															Quantity: {item.quantity} × {formatCurrencyPKR(item.unitPrice)}
														</p>
													</div>
													<div className="font-semibold text-slate-900">
														{formatCurrencyPKR(item.unitPrice * item.quantity)}
													</div>
												</div>
											)
										})}
									</div>
									<div className="mt-4 pt-4 border-t flex items-center justify-between">
										<span className="font-semibold text-slate-900">Subtotal</span>
										<span>{formatCurrencyPKR((orderDetails.totalAmount || 0) - (orderDetails.deliveryFee || 0))}</span>
									</div>
									<div className="flex items-center justify-between text-sm text-slate-600">
										<span>Delivery Fee</span>
										<span>{formatCurrencyPKR(orderDetails.deliveryFee || 0)}</span>
									</div>
									<div className="mt-2 pt-2 border-t flex items-center justify-between">
										<span className="text-lg font-bold text-slate-900">Total</span>
										<span className="text-xl font-bold text-brand-accent">
											{formatCurrencyPKR(orderDetails.totalAmount)}
										</span>
									</div>
								</div>

								{/* Payment Information */}
								{(orderDetails.paymentMethod === 'JAZZCASH' || orderDetails.paymentMethod === 'EASYPAISA') && (
									<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
										<h4 className="font-semibold text-blue-900 mb-3">Payment Information</h4>
										<div className="text-sm space-y-2 text-blue-700">
											<p><span className="font-medium">Payment Method:</span> {orderDetails.paymentMethod}</p>
											{orderDetails.paymentReference && (
												<p><span className="font-medium">Payment Reference:</span> {orderDetails.paymentReference}</p>
											)}
											{orderDetails.jazzcashAccountName && (
												<p><span className="font-medium">Account Name:</span> {orderDetails.jazzcashAccountName}</p>
											)}
											{orderDetails.jazzcashAccountNumber && (
												<p><span className="font-medium">Account Number:</span> {orderDetails.jazzcashAccountNumber}</p>
											)}
											{orderDetails.easypaisaAccountName && (
												<p><span className="font-medium">Account Name:</span> {orderDetails.easypaisaAccountName}</p>
											)}
											{orderDetails.easypaisaAccountNumber && (
												<p><span className="font-medium">Account Number:</span> {orderDetails.easypaisaAccountNumber}</p>
											)}
											{orderDetails.paymentProofDataUrl && (
												<button
													onClick={() => setPreview(orderDetails.paymentProofDataUrl)}
													className="mt-2 text-sm text-blue-600 hover:underline"
												>
													View payment proof
												</button>
											)}
										</div>
									</div>
								)}

								{/* Action Buttons */}
								<div className="flex gap-3 pt-4 border-t">
									<button
										onClick={() => sendOrderDetailsEmail(orderDetails._id)}
										disabled={busy === orderDetails._id}
										className="btn-primary flex items-center gap-2"
									>
										<Send className="h-4 w-4" />
										Send Order Details Email
									</button>
								</div>
							</div>
						)}
					</motion.div>
				</div>
			)}

			{/* Preview Modal */}
			{preview && (
				<div
					className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
					onClick={() => setPreview('')}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						className="max-w-3xl w-full bg-white rounded-xl p-4"
						onClick={(e) => e.stopPropagation()}
					>
						<img src={preview} alt="Payment proof" className="w-full h-auto rounded-lg border" />
						<div className="mt-4 text-right">
							<button onClick={() => setPreview('')} className="btn-secondary">
								Close
							</button>
						</div>
					</motion.div>
				</div>
			)}

			{/* Cancel Order Dialog */}
			{cancelOrderId && (
				<div
					className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
					onClick={() => {
						setCancelOrderId(null)
						setCancelReasonType('')
						setCancelCustomReason('')
					}}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						className="max-w-md w-full bg-white rounded-xl p-6 max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className="text-lg font-semibold text-slate-900 mb-4">Cancel Order</h3>
						<div className="mb-4">
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Select Cancellation Reason <span className="text-red-500">*</span>
							</label>
							<div className="space-y-2">
								{CANCELLATION_REASONS.map((reason) => (
									<label key={reason.value} className="flex items-start gap-2 p-2 rounded border hover:bg-slate-50 cursor-pointer">
										<input
											type="radio"
											name="cancelReason"
											value={reason.value}
											checked={cancelReasonType === reason.value}
											onChange={(e) => setCancelReasonType(e.target.value)}
											className="mt-1"
										/>
										<span className="text-sm text-slate-700">{reason.label}</span>
									</label>
								))}
							</div>
							{cancelReasonType === 'other' && (
								<div className="mt-3">
									<label className="block text-sm font-medium text-slate-700 mb-1.5">
										Custom Reason <span className="text-red-500">*</span>
									</label>
									<textarea
										value={cancelCustomReason}
										onChange={(e) => setCancelCustomReason(e.target.value)}
										placeholder="Enter custom cancellation reason..."
										className="input-enhanced w-full min-h-[80px]"
										rows={3}
									/>
								</div>
							)}
						</div>
						<div className="flex gap-3">
							<button
								onClick={() => {
									setCancelOrderId(null)
									setCancelReasonType('')
									setCancelCustomReason('')
								}}
								className="btn-secondary flex-1"
							>
								Cancel
							</button>
							<button
								onClick={handleCancelOrder}
								disabled={!cancelReasonType || (cancelReasonType === 'other' && !cancelCustomReason.trim()) || busy === cancelOrderId}
								className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
							>
								{busy === cancelOrderId ? 'Cancelling...' : 'Confirm Cancellation'}
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</div>
	)
}
