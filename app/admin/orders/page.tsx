"use client"

import useSWR from 'swr'
import { useState, useMemo } from 'react'
import { CheckCircle2, Truck, BadgeCheck, Search, X, Eye, ChevronDown, ChevronUp, Package, User, Phone, MapPin, Calendar, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrencyPKR } from '@/app/lib/price'
import { motion, AnimatePresence } from 'framer-motion'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AdminOrdersPage() {
	const { data, mutate, isLoading } = useSWR('/api/orders', fetcher)
	const [busy, setBusy] = useState<string>('')
	const [preview, setPreview] = useState<string>('')
	const [searchQuery, setSearchQuery] = useState('')
	const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
	const orders = data?.data || []

	const filteredOrders = useMemo(() => {
		if (!searchQuery.trim()) return orders
		const query = searchQuery.toLowerCase()
		return orders.filter((o: any) => {
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
	}, [orders, searchQuery])

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

	function getStatusColor(status: string) {
		switch (status) {
			case 'CONFIRMED': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
			case 'SHIPPED': return 'text-blue-600 bg-blue-50 border-blue-200'
			case 'DELIVERED': return 'text-green-600 bg-green-50 border-green-200'
			case 'CANCELLED': return 'text-red-600 bg-red-50 border-red-200'
			default: return 'text-amber-600 bg-amber-50 border-amber-200'
		}
	}

	function getPaymentStatusColor(status: string) {
		switch (status) {
			case 'PAID': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
			case 'FAILED': return 'text-red-600 bg-red-50 border-red-200'
			default: return 'text-amber-600 bg-amber-50 border-amber-200'
		}
	}

	function getIconColor(status: string, currentStatus: string) {
		if (status === 'CONFIRMED' && currentStatus === 'CONFIRMED') return 'text-emerald-600'
		if (status === 'SHIPPED' && currentStatus === 'SHIPPED') return 'text-blue-600'
		if (status === 'PAID' && currentStatus === 'PAID') return 'text-emerald-600'
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

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<div className="card-enhanced p-4">
					<div className="text-sm text-slate-600 mb-1">Total Orders</div>
					<div className="text-2xl font-bold text-slate-900">{orders.length}</div>
				</div>
				<div className="card-enhanced p-4">
					<div className="text-sm text-slate-600 mb-1">Pending</div>
					<div className="text-2xl font-bold text-amber-600">
						{orders.filter((o: any) => o.status === 'PENDING').length}
					</div>
				</div>
				<div className="card-enhanced p-4">
					<div className="text-sm text-slate-600 mb-1">Confirmed</div>
					<div className="text-2xl font-bold text-emerald-600">
						{orders.filter((o: any) => o.status === 'CONFIRMED').length}
					</div>
				</div>
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
			) : filteredOrders.length === 0 ? (
				<div className="card-enhanced p-12 text-center">
					<Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600">
						{searchQuery ? 'No orders found matching your search.' : 'No orders yet.'}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{filteredOrders.map((o: any, idx: number) => (
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
										<span className={`badge-status ${getStatusColor(o.status)}`}>
											{o.status}
										</span>
										<span className={`badge-status ${getPaymentStatusColor(o.paymentStatus)}`}>
											{o.paymentStatus}
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
									onClick={() => setExpandedOrder(expandedOrder === o._id ? null : o._id)}
									className="btn-secondary p-2"
								>
									{expandedOrder === o._id ? (
										<ChevronUp className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>

							<AnimatePresence>
								{expandedOrder === o._id && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.2 }}
										className="overflow-hidden"
									>
										<div className="border-t pt-4 mt-4 space-y-4">
											{/* Customer Info */}
											<div className="grid md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<h4 className="font-semibold text-slate-900 flex items-center gap-2">
														<User className="h-4 w-4" />
														Customer Information
													</h4>
													<div className="text-sm space-y-1 text-slate-600">
														<p><span className="font-medium">Name:</span> {o.shippingName}</p>
														<p className="flex items-center gap-1.5">
															<Phone className="h-3.5 w-3.5" />
															<span>{o.shippingPhone}</span>
														</p>
													</div>
												</div>
												<div className="space-y-2">
													<h4 className="font-semibold text-slate-900 flex items-center gap-2">
														<MapPin className="h-4 w-4" />
														Delivery Address
													</h4>
													<div className="text-sm text-slate-600">
														<p>{o.shippingAddress}</p>
														<p>{o.city}</p>
													</div>
												</div>
											</div>

											{/* Order Items */}
											<div>
												<h4 className="font-semibold text-slate-900 mb-2">Order Items</h4>
												<div className="space-y-2">
													{o.items?.map((item: any, i: number) => (
														<div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
															<div>
																<p className="font-medium text-slate-900">{item.title || 'Product'}</p>
																<p className="text-sm text-slate-600">Qty: {item.quantity} × {formatCurrencyPKR(item.unitPrice)}</p>
															</div>
															<div className="font-semibold text-slate-900">
																{formatCurrencyPKR(item.unitPrice * item.quantity)}
															</div>
														</div>
													))}
												</div>
												<div className="mt-3 pt-3 border-t flex items-center justify-between">
													<span className="font-semibold text-slate-900">Total</span>
													<span className="text-xl font-bold text-brand-accent">
														{formatCurrencyPKR(o.totalAmount)}
													</span>
												</div>
											</div>

											{o.paymentMethod === 'JAZZCASH' && (
												<div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
													<p className="text-sm font-medium text-blue-900 mb-1">Payment Reference</p>
													<p className="text-sm text-blue-700">{o.paymentReference || 'N/A'}</p>
													{o.paymentProofDataUrl && (
														<button
															onClick={() => setPreview(o.paymentProofDataUrl)}
															className="mt-2 text-sm text-blue-600 hover:underline"
														>
															View payment proof
														</button>
													)}
												</div>
											)}
										</div>
									</motion.div>
								)}
							</AnimatePresence>

							{/* Action Buttons */}
							<div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
								<button
									disabled={busy === o._id || o.paymentStatus === 'PAID'}
									onClick={() => updateOrder(o._id, { paymentStatus: 'PAID' })}
									className={`btn-secondary p-2 ${getIconColor('PAID', o.paymentStatus)}`}
									title="Approve payment"
								>
									<BadgeCheck className={`h-5 w-5 ${o.paymentStatus === 'PAID' ? 'text-emerald-600' : ''}`} />
								</button>
								<button
									disabled={busy === o._id || o.status === 'CONFIRMED'}
									onClick={() => updateOrder(o._id, { status: 'CONFIRMED' })}
									className={`btn-secondary p-2 ${getIconColor('CONFIRMED', o.status)}`}
									title="Mark confirmed"
								>
									<CheckCircle2 className={`h-5 w-5 ${o.status === 'CONFIRMED' ? 'text-emerald-600' : ''}`} />
								</button>
								<button
									disabled={busy === o._id || o.status === 'SHIPPED'}
									onClick={() => updateOrder(o._id, { status: 'SHIPPED' })}
									className={`btn-secondary p-2 ${getIconColor('SHIPPED', o.status)}`}
									title="Mark shipped"
								>
									<Truck className={`h-5 w-5 ${o.status === 'SHIPPED' ? 'text-blue-600' : ''}`} />
								</button>
							</div>
						</motion.div>
					))}
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
		</div>
	)
}
