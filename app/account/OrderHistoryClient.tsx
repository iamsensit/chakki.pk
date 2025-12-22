"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatCurrencyPKR } from '@/app/lib/price'
import { Package, Truck, CheckCircle, XCircle, Clock, MessageCircle, ChevronDown, HelpCircle } from 'lucide-react'

function getStatusIcon(status: string) {
	switch (status) {
		case 'SHIPPED':
		case 'DELIVERED':
			return <Truck className="h-4 w-4" />
		case 'SHIPPING_IN_PROCESS':
			return <Package className="h-4 w-4" />
		case 'CANCELLED':
			return <XCircle className="h-4 w-4" />
		case 'CONFIRMED':
			return <CheckCircle className="h-4 w-4" />
		default:
			return <Clock className="h-4 w-4" />
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

function getExpectedDeliveryDate(order: any) {
	if (!order.createdAt) return null
	
	const deliveryType = order.deliveryType || 'STANDARD'
	const daysToAdd = deliveryType === 'EXPRESS' ? 2 : 5 // Express: 1-2 days (max 2), Standard: 3-5 days (max 5)
	
	const orderDate = new Date(order.createdAt)
	const expectedDate = new Date(orderDate)
	expectedDate.setDate(expectedDate.getDate() + daysToAdd)
	
	return expectedDate
}

function getStatusDescription(status: string, order: any) {
	switch (status) {
		case 'PENDING':
			return 'Your order is being reviewed. We will confirm it shortly.'
		case 'CONFIRMED':
			const deliveryType = order.deliveryType || 'STANDARD'
			const deliveryTime = deliveryType === 'EXPRESS' ? '1-2 days' : '3-5 days'
			const expectedDate = getExpectedDeliveryDate(order)
			const dateStr = expectedDate ? expectedDate.toLocaleDateString('en-PK', { 
				year: 'numeric', 
				month: 'short', 
				day: 'numeric' 
			}) : ''
			return `Your order is confirmed and being prepared. Expected delivery: ${deliveryTime} (by ${dateStr}).`
		case 'SHIPPING_IN_PROCESS':
			const shippingDeliveryType = order.deliveryType || 'STANDARD'
			const shippingDeliveryTime = shippingDeliveryType === 'EXPRESS' ? '1-2 days' : '3-5 days'
			const shippingExpectedDate = getExpectedDeliveryDate(order)
			const shippingDateStr = shippingExpectedDate ? shippingExpectedDate.toLocaleDateString('en-PK', { 
				year: 'numeric', 
				month: 'short', 
				day: 'numeric' 
			}) : ''
			return `Your order is being packed and prepared for shipment. Expected delivery: ${shippingDeliveryTime} (by ${shippingDateStr}).`
		case 'SHIPPED':
			return 'Your order has been shipped and is on its way to you.'
		case 'DELIVERED':
			return 'Your order has been successfully delivered.'
		case 'CANCELLED':
			return order.cancellationReason ? `Cancelled: ${order.cancellationReason}` : 'This order has been cancelled.'
		default:
			return ''
	}
}

function getStatusColor(status: string) {
	switch (status) {
		case 'SHIPPED':
			return 'text-blue-600 bg-blue-50 border-blue-200'
		case 'SHIPPING_IN_PROCESS':
			return 'text-indigo-600 bg-indigo-50 border-indigo-200'
		case 'DELIVERED':
			return 'text-green-600 bg-green-50 border-green-200'
		case 'CANCELLED':
			return 'text-red-600 bg-red-50 border-red-200'
		case 'CONFIRMED':
			return 'text-emerald-600 bg-emerald-50 border-emerald-200'
		default:
			return 'text-amber-600 bg-amber-50 border-amber-200'
	}
}

export default function OrderHistoryClient() {
	const [orders, setOrders] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
	const [openDropdown, setOpenDropdown] = useState<string | null>(null)

	useEffect(() => {
		;(async () => {
			try {
				const res = await fetch('/api/orders')
				const json = await res.json()
				if (json?.data) setOrders(json.data)
			} finally {
				setLoading(false)
			}
		})()
	}, [])

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (openDropdown && !(event.target as Element).closest('.dropdown-container')) {
				setOpenDropdown(null)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [openDropdown])

	if (loading) return <div className="skeleton h-28" />
	if (!orders.length) return <div className="text-sm text-slate-600">No orders yet.</div>

	const handleWhatsAppContact = (order: any, queryType: string) => {
		const orderId = String(order._id).slice(-8).toUpperCase()
		let message = ''
		
		switch (queryType) {
			case 'cancel':
				message = `Hi! I want to cancel my order #${orderId}. Please help me with the cancellation process.`
				break
			case 'why_cancelled':
				message = `Hi! I have a question about my cancelled order #${orderId}. Can you please explain why it was cancelled?`
				break
			case 'why_not_shipped':
				message = `Hi! I want to know why my order #${orderId} hasn't been shipped yet. Can you please provide an update?`
				break
			case 'fast_shipment':
				message = `Hi! I would like to request fast/express shipment for my order #${orderId}. Is it possible to expedite the delivery?`
				break
			case 'refund':
				message = `Hi! I would like to request a refund for my order #${orderId}. Please help me with the refund process.`
				break
			case 'change_address':
				message = `Hi! I need to change the delivery address for my order #${orderId}. Can you please help me update it?`
				break
			case 'tracking':
				message = `Hi! I need tracking information for my order #${orderId}. Can you please provide the tracking details?`
				break
			case 'damaged':
				message = `Hi! I received a damaged item in my order #${orderId}. Can you please help me resolve this issue?`
				break
			case 'wrong_item':
				message = `Hi! I received the wrong item in my order #${orderId}. Can you please help me fix this?`
				break
			case 'general':
				message = `Hi! I have a question about my order #${orderId}. Please help me.`
				break
			default:
				message = `Hi! I have a question about my order #${orderId}. Please help me.`
		}
		
		const whatsappUrl = `https://wa.me/923393399393?text=${encodeURIComponent(message)}`
		window.open(whatsappUrl, '_blank')
	}

	return (
		<div className="grid gap-6">
			{orders.map((o, idx) => {
				const expectedDate = getExpectedDeliveryDate(o)
				const deliveryType = o.deliveryType || 'STANDARD'
				const deliveryTime = deliveryType === 'EXPRESS' ? '1-2 days' : '3-5 days'
				const dateStr = expectedDate ? expectedDate.toLocaleDateString('en-PK', { 
					year: 'numeric', 
					month: 'short', 
					day: 'numeric' 
				}) : ''
				
				return (
				<motion.div 
					key={String(o._id)} 
					initial={{ opacity: 0, y: 6 }} 
					animate={{ opacity: 1, y: 0 }} 
					transition={{ duration: 0.2, delay: idx * 0.03 }} 
					className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
				>
					<div className="flex items-start justify-between mb-4">
						<div className="flex-1">
							<div className="flex items-center gap-3 mb-3">
								<div className="text-base font-semibold text-slate-900">Order #{String(o._id).slice(-8).toUpperCase()}</div>
								<span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(o.status)} flex items-center gap-1.5`}>
									{getStatusIcon(o.status)}
									{getStatusLabel(o.status)}
								</span>
								{o.status === 'CONFIRMED' && (
									<span className="px-3 py-1 rounded-full text-xs font-medium border text-indigo-600 bg-indigo-50 border-indigo-200 flex items-center gap-1.5">
										<Package className="h-3.5 w-3.5" />
										Shipment Pending
									</span>
								)}
							</div>
							{getStatusDescription(o.status, o) && (
								<div className="text-sm text-slate-600 mb-4 leading-relaxed">
									{getStatusDescription(o.status, o)}
								</div>
							)}
							{(o.status === 'CONFIRMED' || o.status === 'SHIPPING_IN_PROCESS') && (
								<div className="mb-4 text-sm text-slate-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
									<span className="font-semibold text-blue-900">Expected Delivery:</span>{' '}
									<span className="text-blue-800">{deliveryTime} (by {dateStr})</span>
								</div>
							)}
							<div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
								<div className="flex items-center gap-2">
									<Package className="h-4 w-4 text-slate-500" />
									<span>{o.items?.length || 0} items</span>
								</div>
								<div className="flex items-center gap-2">
									<Clock className="h-4 w-4 text-slate-500" />
									<span>{new Date(o.createdAt).toLocaleDateString('en-PK', {
										year: 'numeric',
										month: 'short',
										day: 'numeric'
									})}</span>
								</div>
								<div className="font-semibold text-base text-slate-900">
									{formatCurrencyPKR(o.totalAmount)}
								</div>
							</div>
							{o.status === 'CANCELLED' && o.cancellationReason && (
								<div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
									<strong className="font-semibold">Cancellation Reason:</strong> {o.cancellationReason}
								</div>
							)}
							{o.status === 'CANCELLED' && (
								<div className="mt-4 flex flex-wrap gap-2">
									<button
										onClick={() => handleWhatsAppContact(o, 'why_cancelled')}
										className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-300"
									>
										<HelpCircle className="h-3.5 w-3.5" />
										Why Cancelled?
									</button>
								</div>
							)}
							{o.shippedAt && (
								<div className="mt-4 text-sm text-blue-700">
									<span className="font-medium">Shipped on:</span> {new Date(o.shippedAt).toLocaleDateString('en-PK', {
										year: 'numeric',
										month: 'short',
										day: 'numeric'
									})}
								</div>
							)}
							{o.deliveredAt && (
								<div className="mt-4 text-sm text-green-700">
									<span className="font-medium">Delivered on:</span> {new Date(o.deliveredAt).toLocaleDateString('en-PK', {
										year: 'numeric',
										month: 'short',
										day: 'numeric'
									})}
								</div>
							)}
							{o.cancelledAt && (
								<div className="mt-4 text-sm text-red-700">
									<span className="font-medium">Cancelled on:</span> {new Date(o.cancelledAt).toLocaleDateString('en-PK', {
										year: 'numeric',
										month: 'short',
										day: 'numeric'
									})}
								</div>
							)}
						</div>
						<button
							onClick={() => setExpandedOrder(expandedOrder === String(o._id) ? null : String(o._id))}
							className="text-sm font-medium text-brand-accent hover:text-brand-accent/80 hover:underline transition-colors whitespace-nowrap"
						>
							{expandedOrder === String(o._id) ? 'Hide Details' : 'View Details'}
						</button>
					</div>
					
					{expandedOrder === String(o._id) && (
						<div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
							<div>
								<div className="font-semibold text-slate-900 mb-2 text-sm">Shipping Address</div>
								<div className="text-sm text-slate-600 leading-relaxed">
									{o.shippingName}<br />
									{o.shippingPhone}<br />
									{o.shippingAddress}, {o.city}
								</div>
							</div>
							<div>
								<div className="font-semibold text-slate-900 mb-2 text-sm">Order Items</div>
								<div className="space-y-2">
									{o.items?.map((item: any, i: number) => (
										<div key={i} className="text-sm text-slate-600 flex items-center justify-between py-1">
											<span>{item.title || 'Product'} {item.variantLabel ? `(${item.variantLabel})` : ''} × {item.quantity}</span>
											<span className="font-medium">{formatCurrencyPKR(item.unitPrice * item.quantity)}</span>
										</div>
									))}
								</div>
							</div>
							<div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
								<span className="text-slate-600">Delivery Fee:</span>
								<span className="font-medium">{formatCurrencyPKR(o.deliveryFee || 0)}</span>
							</div>
							<div className="flex items-center justify-between font-bold text-base pt-2 border-t border-slate-200">
								<span className="text-slate-900">Total:</span>
								<span className="text-slate-900">{formatCurrencyPKR(o.totalAmount)}</span>
							</div>
							{/* Contact Options Section */}
							<div className="mt-4 pt-4 border-t border-slate-200">
								<div className="flex flex-wrap items-center gap-2 mb-3">
									{(o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'SHIPPING_IN_PROCESS') && (
										<>
											<button
												onClick={() => handleWhatsAppContact(o, 'cancel')}
												className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-xs font-medium transition-colors border border-red-200"
											>
												<XCircle className="h-3.5 w-3.5" />
												Cancel Order
											</button>
											<button
												onClick={() => handleWhatsAppContact(o, 'why_not_shipped')}
												className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md text-xs font-medium transition-colors border border-amber-200"
											>
												<Clock className="h-3.5 w-3.5" />
												Why Not Shipped?
											</button>
											<button
												onClick={() => handleWhatsAppContact(o, 'fast_shipment')}
												className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-colors border border-blue-200"
											>
												<Truck className="h-3.5 w-3.5" />
												Fast Shipment
											</button>
										</>
									)}
									{(o.status === 'SHIPPED' || o.status === 'DELIVERED') && (
										<button
											onClick={() => handleWhatsAppContact(o, 'tracking')}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-colors border border-blue-200"
										>
											<Truck className="h-3.5 w-3.5" />
											Track Order
										</button>
									)}
									{o.status === 'CANCELLED' && (
										<button
											onClick={() => handleWhatsAppContact(o, 'why_cancelled')}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-300"
										>
											<HelpCircle className="h-3.5 w-3.5" />
											Why Cancelled?
										</button>
									)}
									
									{/* Other Queries Dropdown */}
									<div className="relative dropdown-container">
										<button
											onClick={() => setOpenDropdown(openDropdown === String(o._id) ? null : String(o._id))}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-300"
										>
											<MessageCircle className="h-3.5 w-3.5" />
											Other Queries
											<ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === String(o._id) ? 'rotate-180' : ''}`} />
										</button>
										
										{openDropdown === String(o._id) && (
											<div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1">
												<button
													onClick={() => {
														handleWhatsAppContact(o, 'refund')
														setOpenDropdown(null)
													}}
													className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
												>
													<MessageCircle className="h-3.5 w-3.5" />
													Request Refund
												</button>
												<button
													onClick={() => {
														handleWhatsAppContact(o, 'change_address')
														setOpenDropdown(null)
													}}
													className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
												>
													<MessageCircle className="h-3.5 w-3.5" />
													Change Address
												</button>
												<button
													onClick={() => {
														handleWhatsAppContact(o, 'damaged')
														setOpenDropdown(null)
													}}
													className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
												>
													<MessageCircle className="h-3.5 w-3.5" />
													Damaged Item
												</button>
												<button
													onClick={() => {
														handleWhatsAppContact(o, 'wrong_item')
														setOpenDropdown(null)
													}}
													className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
												>
													<MessageCircle className="h-3.5 w-3.5" />
													Wrong Item Received
												</button>
												<button
													onClick={() => {
														handleWhatsAppContact(o, 'general')
														setOpenDropdown(null)
													}}
													className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
												>
													<MessageCircle className="h-3.5 w-3.5" />
													General Query
												</button>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					)}
				</motion.div>
				)
			})}
		</div>
	)
}
