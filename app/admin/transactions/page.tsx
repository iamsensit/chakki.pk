"use client"

import useSWR from 'swr'
import { useState, useMemo } from 'react'
import { TrendingUp, Package, DollarSign, ShoppingCart, Calendar, Filter, Download, BarChart3, PieChart } from 'lucide-react'
import { formatCurrencyPKR } from '@/app/lib/price'
import { motion } from 'framer-motion'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TransactionsPage() {
	const { data: ordersData, isLoading: ordersLoading } = useSWR('/api/orders', fetcher)
	const { data: posData, isLoading: posLoading } = useSWR('/api/pos/sales', fetcher)
	const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('month')
	
	const orders = ordersData?.data || []
	const posSales = posData?.data || []
	
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
	
	// Calculate totals
	const totalRevenue = filteredOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0) +
		filteredPOS.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
	
	const totalOrders = filteredOrders.length
	const totalPOS = filteredPOS.length
	const totalTransactions = totalOrders + totalPOS
	
	// Stock tracking - aggregate items sold
	const stockSold = useMemo(() => {
		const sold: Record<string, { productId: string; variantId?: string; title: string; quantity: number; revenue: number }> = {}
		
		// From orders
		filteredOrders.forEach((order: any) => {
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
		
		// From POS
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
	}, [filteredOrders, filteredPOS])
	
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
						{formatCurrencyPKR(filteredOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0))}
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
				{isLoading ? (
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
								{stockSold.map((item, idx) => (
									<motion.tr
										key={`${item.productId}-${item.variantId || 'none'}`}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: idx * 0.05 }}
										className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
									>
										<td className="py-3 px-4">
											<div className="font-medium text-slate-900">{item.title}</div>
											{item.variantId && (
												<div className="text-xs text-slate-500">Variant ID: {item.variantId.slice(-6)}</div>
											)}
										</td>
										<td className="py-3 px-4 text-right font-medium text-slate-900">{item.quantity}</td>
										<td className="py-3 px-4 text-right font-semibold text-brand-accent">
											{formatCurrencyPKR(item.revenue)}
										</td>
									</motion.tr>
								))}
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
					) : filteredOrders.length === 0 ? (
						<div className="text-center py-8 text-slate-600">
							<p>No orders for this period.</p>
						</div>
					) : (
						<div className="space-y-3">
							{filteredOrders.slice(0, 5).map((order: any, idx: number) => (
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
										<span className="text-sm font-semibold text-brand-accent">
											{formatCurrencyPKR(order.totalAmount)}
										</span>
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
										<span className="text-sm font-semibold text-emerald-600">
											{formatCurrencyPKR(sale.total)}
										</span>
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
		</div>
	)
}

