"use client"

import useSWR from 'swr'
import { useState, useMemo, useEffect, useRef } from 'react'
import { TrendingUp, Package, DollarSign, ShoppingCart, Calendar, Filter, Download, BarChart3, PieChart, Eye, X, User, Phone, MapPin, Truck } from 'lucide-react'
import { formatCurrencyPKR } from '@/app/lib/price'
import { motion, AnimatePresence } from 'framer-motion'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TransactionsPage() {
	const { data: ordersData, isLoading: ordersLoading } = useSWR('/api/orders', fetcher)
	const { data: posData, isLoading: posLoading } = useSWR('/api/pos/sales', fetcher)
	const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('month')
	const [selectedOrder, setSelectedOrder] = useState<any>(null)
	const [selectedPOS, setSelectedPOS] = useState<any>(null)
	const [orderDetailsLoading, setOrderDetailsLoading] = useState(false)
	const [posDetailsLoading, setPosDetailsLoading] = useState(false)
	const [productDetails, setProductDetails] = useState<Record<string, any>>({})
	const [stockProductDetails, setStockProductDetails] = useState<Record<string, any>>({})
	const [stockLoading, setStockLoading] = useState(true)
	
	// Refs to prevent infinite loops
	const fetchedProductIdsRef = useRef<Set<string>>(new Set())
	const fetchingRef = useRef(false)
	const lastStockSoldRef = useRef<string>('')
	
	const orders = ordersData?.data || []
	const posSales = posData?.data || []
	
	async function loadOrderDetails(order: any) {
		setOrderDetailsLoading(true)
		setSelectedOrder(order)
		
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
	
	async function loadPOSDetails(sale: any) {
		setPosDetailsLoading(true)
		setSelectedPOS(sale)
		
		// Load product details for each item
		const productIds = sale.items?.map((item: any) => item.productId).filter(Boolean) || []
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
		setPosDetailsLoading(false)
	}
	
	const now = new Date()
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
	
	const filterDate = (date: string) => {
		const d = new Date(date)
		switch (dateFilter) {
			case 'today': return d >= todayStart
			case 'week': return d >= weekStart
			case 'month': return d >= monthStart
			default: return true
		}
	}
	
	const filteredOrders = useMemo(() => orders.filter((o: any) => filterDate(o.createdAt)), [orders, dateFilter])
	const filteredPOS = useMemo(() => posSales.filter((s: any) => filterDate(s.createdAt)), [posSales, dateFilter])
	
	// Helper function to check if order should count in revenue
	const shouldCountInRevenue = (order: any): boolean => {
		// Never count cancelled orders
		if (order.status === 'CANCELLED') return false
		
		const paymentMethod = order.paymentMethod
		const status = order.status
		
		// For online payments (JazzCash, EasyPaisa): count only if CONFIRMED, SHIPPED, or DELIVERED
		if (paymentMethod === 'JAZZCASH' || paymentMethod === 'EASYPAISA') {
			return status === 'CONFIRMED' || status === 'SHIPPED' || status === 'DELIVERED' || status === 'SHIPPING_IN_PROCESS'
		}
		
		// For COD: count only if SHIPPED or DELIVERED (payment received on delivery)
		if (paymentMethod === 'COD') {
			return status === 'SHIPPED' || status === 'DELIVERED'
		}
		
		// Default: don't count
		return false
	}
	
	// Calculate totals - only count orders that should be in revenue
	const revenueOrders = useMemo(() => filteredOrders.filter(shouldCountInRevenue), [filteredOrders])
	const totalRevenue = revenueOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0) +
		filteredPOS.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
	
	const totalOrders = revenueOrders.length
	const totalPOS = filteredPOS.length
	const totalTransactions = totalOrders + totalPOS
	
	// Stock tracking - aggregate items sold (only from revenue-counted orders)
	const stockSold = useMemo(() => {
		const sold: Record<string, { productId: string; variantId?: string; title: string; quantity: number; revenue: number }> = {}
		
		// From orders - only count orders that should be in revenue
		revenueOrders.forEach((order: any) => {
			order.items?.forEach((item: any) => {
				const key = `${item.productId}-${item.variantId || 'none'}`
				if (!sold[key]) {
					sold[key] = {
						productId: item.productId,
						variantId: item.variantId,
						title: item.title || 'Product',
						quantity: 0,
						revenue: 0
					}
				}
				sold[key].quantity += item.quantity || 0
				sold[key].revenue += (item.unitPrice || 0) * (item.quantity || 0)
			})
		})
		
		// From POS (always count POS sales as they're immediate)
		filteredPOS.forEach((sale: any) => {
			sale.items?.forEach((item: any) => {
				const key = `${item.productId}-${item.variantId || 'none'}`
				if (!sold[key]) {
					sold[key] = {
						productId: item.productId,
						variantId: item.variantId,
						title: item.title || 'Product',
						quantity: 0,
						revenue: 0
					}
				}
				sold[key].quantity += item.quantity || 0
				sold[key].revenue += (item.unitPrice || 0) * (item.quantity || 0)
			})
		})
		
		return Object.values(sold).sort((a, b) => b.revenue - a.revenue)
	}, [revenueOrders, filteredPOS])
	
	// Fetch product details for stock movement table - with loop prevention
	useEffect(() => {
		if (stockSold.length === 0) {
			setStockLoading(false)
			return
		}
		
		// Create a stable key from stockSold to detect actual changes
		const stockSoldKey = JSON.stringify(stockSold.map(item => item.productId).sort())
		
		// If stockSold hasn't actually changed, don't refetch
		if (stockSoldKey === lastStockSoldRef.current) {
			return
		}
		
		lastStockSoldRef.current = stockSoldKey
		
		const uniqueProductIds = [...new Set(stockSold.map((item: any) => item.productId).filter(Boolean))]
		const productIdStrings = uniqueProductIds.map(id => String(id))
		
		// Check which products we need to fetch (not already fetched)
		const missingProductIds = productIdStrings.filter(id => !fetchedProductIdsRef.current.has(id))
		
		// If all products are already fetched, don't fetch again
		if (missingProductIds.length === 0) {
			setStockLoading(false)
			return
		}
		
		// Prevent concurrent fetches
		if (fetchingRef.current) {
			return
		}
		
		fetchingRef.current = true
		setStockLoading(true)
		
		// Mark these as being fetched
		missingProductIds.forEach(id => fetchedProductIdsRef.current.add(id))
		
		// Only fetch missing products
		Promise.all(
			missingProductIds.map(async (productId: string) => {
				try {
					const res = await fetch(`/api/products/${productId}`)
					const json = await res.json()
					if (json?.success && json?.data) {
						return { productId, product: json.data }
					}
					return null
				} catch (error) {
					console.error('Failed to load product:', productId, error)
					// Remove from fetched set on error so it can be retried
					fetchedProductIdsRef.current.delete(productId)
					return null
				}
			})
		).then((results) => {
			setStockProductDetails((prev: Record<string, any>) => {
				const details: Record<string, any> = { ...prev } // Preserve existing
				results.forEach((result) => {
					if (result) {
						details[result.productId] = result.product
					}
				})
				return details
			})
			setStockLoading(false)
			fetchingRef.current = false
		}).catch((error) => {
			console.error('Error loading product details:', error)
			setStockLoading(false)
			fetchingRef.current = false
			// Remove from fetched set on error so it can be retried
			missingProductIds.forEach(id => fetchedProductIdsRef.current.delete(id))
		})
	}, [stockSold]) // Only depend on stockSold
	
	const isLoading = ordersLoading || posLoading
	
	return (
		<div className="container-pg py-8">
			<div className="mb-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-slate-900 mb-2">Sales & Transactions</h1>
						<p className="text-slate-600">Track all orders, sales, and stock movements</p>
					</div>
					<div className="flex items-center gap-2">
						<select
							value={dateFilter}
							onChange={(e) => setDateFilter(e.target.value as any)}
							className="input-enhanced"
						>
							<option value="all">All Time</option>
							<option value="today">Today</option>
							<option value="week">This Week</option>
							<option value="month">This Month</option>
						</select>
					</div>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="card-enhanced p-6"
				>
					<div className="flex items-center justify-between mb-2">
						<div className="text-sm text-slate-600">Total Revenue</div>
						<DollarSign className="h-5 w-5 text-brand-accent" />
					</div>
					<div className="text-2xl font-bold text-slate-900">{formatCurrencyPKR(totalRevenue)}</div>
					<div className="text-xs text-slate-500 mt-1">{totalTransactions} transactions</div>
				</motion.div>
				
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="card-enhanced p-6"
				>
					<div className="flex items-center justify-between mb-2">
						<div className="text-sm text-slate-600">Online Orders</div>
						<ShoppingCart className="h-5 w-5 text-blue-500" />
					</div>
					<div className="text-2xl font-bold text-slate-900">{totalOrders}</div>
					<div className="text-xs text-slate-500 mt-1">
						{formatCurrencyPKR(revenueOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0))}
					</div>
				</motion.div>
				
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="card-enhanced p-6"
				>
					<div className="flex items-center justify-between mb-2">
						<div className="text-sm text-slate-600">POS Sales</div>
						<Package className="h-5 w-5 text-emerald-500" />
					</div>
					<div className="text-2xl font-bold text-slate-900">{totalPOS}</div>
					<div className="text-xs text-slate-500 mt-1">
						{formatCurrencyPKR(filteredPOS.reduce((sum: number, s: any) => sum + (s.total || 0), 0))}
					</div>
				</motion.div>
				
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="card-enhanced p-6"
				>
					<div className="flex items-center justify-between mb-2">
						<div className="text-sm text-slate-600">Items Sold</div>
						<TrendingUp className="h-5 w-5 text-purple-500" />
					</div>
					<div className="text-2xl font-bold text-slate-900">
						{stockSold.reduce((sum, item) => sum + item.quantity, 0)}
					</div>
					<div className="text-xs text-slate-500 mt-1">{stockSold.length} products</div>
				</motion.div>
			</div>

			{/* Stock Movement */}
			<div className="card-enhanced p-6 mb-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
						<BarChart3 className="h-5 w-5" />
						Stock Movement
					</h2>
				</div>
				{isLoading || stockLoading ? (
					<div className="space-y-2">
						{[...Array(5)].map((_, i) => (
							<div key={i} className="skeleton h-16" />
						))}
					</div>
				) : stockSold.length === 0 ? (
					<div className="text-center py-8 text-slate-600">
						<Package className="h-12 w-12 mx-auto mb-4 text-slate-400" />
						<p>No sales recorded for this period.</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-slate-200">
									<th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product</th>
									<th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Quantity Sold</th>
									<th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Revenue</th>
								</tr>
							</thead>
							<tbody>
								{stockSold.map((item, idx) => {
									const product = stockProductDetails[item.productId]
									const productName = product?.title || item.title || 'Product'
									const productImage = product?.images?.[0] || ''
									
									// Find variant label if variantId exists
									let variantLabel = ''
									if (item.variantId && product?.variants) {
										const variant = product.variants.find((v: any) => 
											String(v._id || v.id) === String(item.variantId)
										)
										variantLabel = variant?.label || ''
									}
									
									return (
										<motion.tr
											key={`${item.productId}-${item.variantId || 'none'}`}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: idx * 0.05 }}
											className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
										>
											<td className="py-3 px-4">
												<div className="flex items-center gap-3">
													{productImage && (
														<img
															src={productImage}
															alt={productName}
															className="w-12 h-12 object-cover rounded-md"
														/>
													)}
													<div>
														<div className="font-medium text-slate-900">{productName}</div>
														{variantLabel && (
															<div className="text-xs text-slate-500">Variant: {variantLabel}</div>
														)}
														{item.variantId && !variantLabel && (
															<div className="text-xs text-slate-500">Variant ID: {String(item.variantId).slice(-8)}</div>
														)}
														{product?.brand && (
															<div className="text-xs text-slate-400">Brand: {product.brand}</div>
														)}
													</div>
												</div>
											</td>
											<td className="py-3 px-4 text-right font-medium text-slate-900">{item.quantity}</td>
											<td className="py-3 px-4 text-right font-semibold text-brand-accent">
												{formatCurrencyPKR(item.revenue)}
											</td>
										</motion.tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Recent Transactions */}
			<div className="grid md:grid-cols-2 gap-6">
				{/* Recent Orders */}
				<div className="card-enhanced p-6">
					<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
						<ShoppingCart className="h-5 w-5" />
						Recent Orders
					</h2>
					{isLoading ? (
						<div className="space-y-2">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="skeleton h-20" />
							))}
						</div>
					) : revenueOrders.length === 0 ? (
						<div className="text-center py-8 text-slate-600">
							<p>No orders for this period.</p>
						</div>
					) : (
						<div className="space-y-3">
							{revenueOrders.slice(0, 5).map((order: any, idx: number) => (
								<motion.div
									key={order._id}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: idx * 0.1 }}
									className="p-3 bg-slate-50 rounded-lg border border-slate-200"
								>
									<div className="flex items-center justify-between mb-1">
										<span className="font-medium text-slate-900">
											Order #{String(order._id).slice(-8)}
										</span>
										<div className="flex items-center gap-2">
											<span className="text-sm font-semibold text-brand-accent">
												{formatCurrencyPKR(order.totalAmount)}
											</span>
											<button
												onClick={() => loadOrderDetails(order)}
												className="p-1.5 hover:bg-slate-200 rounded transition-colors"
												title="View order details"
											>
												<Eye className="h-4 w-4 text-slate-600" />
											</button>
										</div>
									</div>
									<div className="flex items-center gap-2 text-xs text-slate-600">
										<Calendar className="h-3 w-3" />
										{new Date(order.createdAt).toLocaleDateString()}
										<span className="mx-1">•</span>
										{order.items?.length || 0} items
										<span className="mx-1">•</span>
										{order.paymentMethod}
									</div>
								</motion.div>
							))}
						</div>
					)}
				</div>

				{/* Recent POS Sales */}
				<div className="card-enhanced p-6">
					<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
						<Package className="h-5 w-5" />
						Recent POS Sales
					</h2>
					{isLoading ? (
						<div className="space-y-2">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="skeleton h-20" />
							))}
						</div>
					) : filteredPOS.length === 0 ? (
						<div className="text-center py-8 text-slate-600">
							<p>No POS sales for this period.</p>
						</div>
					) : (
						<div className="space-y-3">
							{filteredPOS.slice(0, 5).map((sale: any, idx: number) => (
								<motion.div
									key={sale._id || sale.receiptNumber}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: idx * 0.1 }}
									className="p-3 bg-slate-50 rounded-lg border border-slate-200"
								>
									<div className="flex items-center justify-between mb-1">
										<span className="font-medium text-slate-900">
											{sale.receiptNumber || 'POS Sale'}
										</span>
										<div className="flex items-center gap-2">
											<span className="text-sm font-semibold text-emerald-600">
												{formatCurrencyPKR(sale.total)}
											</span>
											<button
												onClick={() => loadPOSDetails(sale)}
												className="p-1.5 hover:bg-slate-200 rounded transition-colors"
												title="View sale details"
											>
												<Eye className="h-4 w-4 text-slate-600" />
											</button>
										</div>
									</div>
									<div className="flex items-center gap-2 text-xs text-slate-600">
										<Calendar className="h-3 w-3" />
										{new Date(sale.createdAt).toLocaleDateString()}
										<span className="mx-1">•</span>
										{sale.items?.length || 0} items
										<span className="mx-1">•</span>
										{sale.paymentMethod}
									</div>
								</motion.div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Order Details Modal */}
			<AnimatePresence>
				{selectedOrder && (
					<div
						className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
						onClick={() => {
							setSelectedOrder(null)
							setProductDetails({})
						}}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="max-w-4xl w-full bg-white rounded-xl p-6 max-h-[90vh] overflow-y-auto"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-center justify-between mb-6">
								<h3 className="text-2xl font-bold text-slate-900">
									Order #{String(selectedOrder._id).slice(-8).toUpperCase()}
								</h3>
								<button
									onClick={() => {
										setSelectedOrder(null)
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
									{/* Order Info */}
									<div className="grid md:grid-cols-2 gap-4">
										<div className="p-4 bg-slate-50 rounded-lg">
											<div className="text-sm text-slate-600 mb-1">Order Status</div>
											<div className="font-semibold text-slate-900">{selectedOrder.status}</div>
										</div>
										<div className="p-4 bg-slate-50 rounded-lg">
											<div className="text-sm text-slate-600 mb-1">Payment Status</div>
											<div className="font-semibold text-slate-900">{selectedOrder.paymentStatus}</div>
										</div>
									</div>

									{/* Customer Information */}
									<div className="p-4 border rounded-lg">
										<h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
											<User className="h-4 w-4" />
											Customer Information
										</h4>
										<div className="text-sm space-y-2 text-slate-600">
											<p><span className="font-medium">Name:</span> {selectedOrder.shippingName}</p>
											<p className="flex items-center gap-1.5">
												<Phone className="h-3.5 w-3.5" />
												<span>{selectedOrder.shippingPhone}</span>
											</p>
											<p className="flex items-center gap-1.5">
												<MapPin className="h-3.5 w-3.5" />
												<span>{selectedOrder.shippingAddress}, {selectedOrder.city}</span>
											</p>
										</div>
									</div>

									{/* Delivery Info */}
									{selectedOrder.deliveryType && (
										<div className="p-4 border rounded-lg">
											<h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-2">
												<Truck className="h-4 w-4" />
												Delivery Information
											</h4>
											<div className="text-sm text-slate-600 space-y-1">
												<p><span className="font-medium">Delivery Type:</span> {selectedOrder.deliveryType}</p>
												<p><span className="font-medium">Delivery Fee:</span> {formatCurrencyPKR(selectedOrder.deliveryFee || 0)}</p>
											</div>
										</div>
									)}

									{/* Order Items */}
									<div className="p-4 border rounded-lg">
										<h4 className="font-semibold text-slate-900 mb-4">Order Items</h4>
										<div className="space-y-4">
											{selectedOrder.items?.map((item: any, i: number) => {
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
															{item.variantId && (
																<p className="text-sm text-slate-600">Variant ID: {String(item.variantId).slice(-6)}</p>
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
											<span className="text-lg font-bold text-slate-900">Total</span>
											<span className="text-xl font-bold text-brand-accent">
												{formatCurrencyPKR(selectedOrder.totalAmount)}
											</span>
										</div>
									</div>

									{/* Payment Info */}
									{selectedOrder.paymentMethod !== 'COD' && (
										<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
											<h4 className="font-semibold text-blue-900 mb-2">Payment Information</h4>
											<div className="text-sm space-y-1 text-blue-700">
												<p><span className="font-medium">Payment Method:</span> {selectedOrder.paymentMethod}</p>
												{selectedOrder.paymentReference && (
													<p><span className="font-medium">Reference:</span> {selectedOrder.paymentReference}</p>
												)}
											</div>
										</div>
									)}
								</div>
							)}
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* POS Sale Details Modal */}
			<AnimatePresence>
				{selectedPOS && (
					<div
						className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
						onClick={() => {
							setSelectedPOS(null)
							setProductDetails({})
						}}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="max-w-4xl w-full bg-white rounded-xl p-6 max-h-[90vh] overflow-y-auto"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-center justify-between mb-6">
								<h3 className="text-2xl font-bold text-slate-900">
									{selectedPOS.receiptNumber || 'POS Sale'}
								</h3>
								<button
									onClick={() => {
										setSelectedPOS(null)
										setProductDetails({})
									}}
									className="btn-secondary p-2"
								>
									<X className="h-5 w-5" />
								</button>
							</div>

							{posDetailsLoading ? (
								<div className="text-center py-8">
									<div className="skeleton h-32 w-full" />
								</div>
							) : (
								<div className="space-y-6">
									{/* Sale Info */}
									<div className="grid md:grid-cols-2 gap-4">
										<div className="p-4 bg-slate-50 rounded-lg">
											<div className="text-sm text-slate-600 mb-1">Receipt Number</div>
											<div className="font-semibold text-slate-900">{selectedPOS.receiptNumber}</div>
										</div>
										<div className="p-4 bg-slate-50 rounded-lg">
											<div className="text-sm text-slate-600 mb-1">Payment Method</div>
											<div className="font-semibold text-slate-900">{selectedPOS.paymentMethod}</div>
										</div>
									</div>

									{/* Date */}
									<div className="p-4 bg-slate-50 rounded-lg">
										<div className="text-sm text-slate-600 mb-1">Sale Date</div>
										<div className="font-semibold text-slate-900">
											{new Date(selectedPOS.createdAt).toLocaleString()}
										</div>
									</div>

									{/* Sale Items */}
									<div className="p-4 border rounded-lg">
										<h4 className="font-semibold text-slate-900 mb-4">Items Sold</h4>
										<div className="space-y-4">
											{selectedPOS.items?.map((item: any, i: number) => {
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
															{item.variantId && (
																<p className="text-sm text-slate-600">Variant ID: {String(item.variantId).slice(-6)}</p>
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
											<span className="text-lg font-bold text-slate-900">Total</span>
											<span className="text-xl font-bold text-emerald-600">
												{formatCurrencyPKR(selectedPOS.total)}
											</span>
										</div>
									</div>
								</div>
							)}
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	)
}
