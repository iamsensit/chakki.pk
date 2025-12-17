"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatCurrencyPKR } from '@/app/lib/price'

export default function OrderHistoryClient() {
	const [orders, setOrders] = useState<any[]>([])
	const [loading, setLoading] = useState(true)

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

	if (loading) return <div className="skeleton h-28" />
	if (!orders.length) return <div className="text-sm text-slate-600">No orders yet.</div>

	return (
		<div className="grid gap-3">
			{orders.map((o, idx) => (
				<motion.div key={String(o._id)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.03 }} className="rounded-md border p-3 text-sm">
					<div className="flex items-center justify-between">
						<div className="font-medium">Order #{String(o._id).slice(-6)}</div>
						<div className="text-slate-600">{new Date(o.createdAt).toLocaleString()}</div>
					</div>
					<div className="mt-2 flex items-center justify-between">
						<div className="text-slate-600">{o.items?.length} items • {o.paymentMethod} • {o.status}</div>
						<div className="font-semibold">{formatCurrencyPKR(o.totalAmount)}</div>
					</div>
				</motion.div>
			))}
		</div>
	)
}
