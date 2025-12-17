"use client"

import useSWR from 'swr'
import { useState } from 'react'
import { CheckCircle2, Truck, BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AdminOrdersPage() {
	const { data, mutate, isLoading } = useSWR('/api/orders', fetcher)
	const [busy, setBusy] = useState<string>('')
	const [preview, setPreview] = useState<string>('')
	const orders = data?.data || []

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

	return (
		<div className="mx-auto w-full max-w-5xl">
			<h1 className="text-2xl font-semibold">Orders</h1>
			{isLoading ? (
				<div className="mt-6 skeleton h-20" />
			) : (
				<div className="mt-6 grid gap-3">
					{orders.map((o: any) => (
						<div key={o._id} className="rounded-md border p-3 text-sm">
							<div className="flex items-center justify-between">
								<div className="font-medium">Order #{String(o._id).slice(-6)}</div>
								<div className="text-slate-600">{new Date(o.createdAt).toLocaleString()}</div>
							</div>
							<div className="mt-2 grid gap-2 sm:grid-cols-2">
								<div className="text-slate-600">{o.items?.length} items • {o.paymentMethod} • {o.paymentStatus} • {o.status}</div>
								{(o.paymentMethod === 'JAZZCASH') && (
									<div className="flex items-center gap-3">
										<div>Ref: <span className="font-medium">{o.paymentReference || '-'}</span></div>
										{o.paymentProofDataUrl && (
											<button onClick={() => setPreview(o.paymentProofDataUrl)} className="focus:outline-none">
												<img src={o.paymentProofDataUrl} alt="Proof" className="h-14 w-14 rounded object-cover border hover:opacity-90" />
											</button>
										)}
									</div>
								)}
							</div>
							<div className="mt-2 flex flex-wrap gap-2">
								<button disabled={busy === o._id} onClick={() => updateOrder(o._id, { paymentStatus: 'PAID' })} className="rounded-md border p-2 hover:bg-gray-50" title="Approve payment">
									<BadgeCheck className="h-4 w-4" />
								</button>
								<button disabled={busy === o._id} onClick={() => updateOrder(o._id, { status: 'CONFIRMED' })} className="rounded-md border p-2 hover:bg-gray-50" title="Mark confirmed">
									<CheckCircle2 className="h-4 w-4" />
								</button>
								<button disabled={busy === o._id} onClick={() => updateOrder(o._id, { status: 'SHIPPED' })} className="rounded-md border p-2 hover:bg-gray-50" title="Mark shipped">
									<Truck className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{preview && (
				<div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setPreview('')}>
					<div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
						<img src={preview} alt="Payment proof" className="w-full h-auto rounded border" />
						<div className="mt-2 text-right">
							<button onClick={() => setPreview('')} className="rounded-md bg-white px-3 py-1.5 text-sm">Close</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
