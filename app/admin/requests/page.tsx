"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MapPin, Package, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react'

type Request = {
	_id: string
	type: 'delivery_area' | 'out_of_stock'
	userEmail: string
	userName?: string
	status: 'pending' | 'approved' | 'rejected'
	address?: string
	city?: string
	latitude?: number
	longitude?: number
	productId?: any
	productTitle?: string
	variantId?: string
	variantLabel?: string
	notes?: string
	adminNotes?: string
	createdAt: string
	updatedAt: string
}

export default function RequestsPage() {
	const { data: session, status: sessionStatus } = useSession()
	const router = useRouter()
	const [requests, setRequests] = useState<Request[]>([])
	const [loading, setLoading] = useState(true)
	const [filterType, setFilterType] = useState<'all' | 'delivery_area' | 'out_of_stock'>('all')
	const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
	const [searchQuery, setSearchQuery] = useState('')
	const [updating, setUpdating] = useState<string | null>(null)

	useEffect(() => {
		if (sessionStatus === 'loading') return
		if (sessionStatus === 'unauthenticated') {
			router.push('/auth/login')
			return
		}
		loadRequests()
	}, [sessionStatus, filterType, filterStatus, router])

	async function loadRequests() {
		setLoading(true)
		try {
			const params = new URLSearchParams()
			if (filterType !== 'all') params.append('type', filterType)
			if (filterStatus !== 'all') params.append('status', filterStatus)
			
			const res = await fetch(`/api/requests?${params.toString()}`)
			const json = await res.json()
			if (json.success) {
				setRequests(json.data.requests || [])
			} else {
				toast.error(json.message || 'Failed to load requests')
			}
		} catch (error) {
			console.error('Load requests error:', error)
			toast.error('Failed to load requests')
		} finally {
			setLoading(false)
		}
	}

	async function updateRequestStatus(requestId: string, newStatus: 'approved' | 'rejected', adminNotes?: string) {
		setUpdating(requestId)
		try {
			const res = await fetch(`/api/requests/${requestId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus, adminNotes }),
			})
			const json = await res.json()
			if (json.success) {
				toast.success(`Request ${newStatus}`)
				loadRequests()
			} else {
				toast.error(json.message || 'Failed to update request')
			}
		} catch (error) {
			console.error('Update request error:', error)
			toast.error('Failed to update request')
		} finally {
			setUpdating(null)
		}
	}

	const filteredRequests = requests.filter(req => {
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			return (
				req.userEmail?.toLowerCase().includes(query) ||
				req.userName?.toLowerCase().includes(query) ||
				req.address?.toLowerCase().includes(query) ||
				req.city?.toLowerCase().includes(query) ||
				req.productTitle?.toLowerCase().includes(query)
			)
		}
		return true
	})

	if (sessionStatus === 'loading' || loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-gray-500">Loading...</div>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
			<h1 className="text-2xl sm:text-3xl font-semibold mb-6">Requested Areas & Products</h1>

			{/* Filters */}
			<div className="mb-6 grid gap-4 sm:grid-cols-3">
				<div>
					<label className="text-sm font-medium text-gray-700 mb-1.5 block">Filter by Type</label>
					<select
						value={filterType}
						onChange={e => setFilterType(e.target.value as any)}
						className="input-enhanced w-full"
					>
						<option value="all">All Types</option>
						<option value="delivery_area">Delivery Areas</option>
						<option value="out_of_stock">Out of Stock</option>
					</select>
				</div>
				<div>
					<label className="text-sm font-medium text-gray-700 mb-1.5 block">Filter by Status</label>
					<select
						value={filterStatus}
						onChange={e => setFilterStatus(e.target.value as any)}
						className="input-enhanced w-full"
					>
						<option value="all">All Status</option>
						<option value="pending">Pending</option>
						<option value="approved">Approved</option>
						<option value="rejected">Rejected</option>
					</select>
				</div>
				<div>
					<label className="text-sm font-medium text-gray-700 mb-1.5 block">Search</label>
					<div className="relative">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							placeholder="Search by email, name, address..."
							className="input-enhanced pl-8 w-full"
						/>
					</div>
				</div>
			</div>

			{/* Requests List */}
			{filteredRequests.length === 0 ? (
				<div className="text-center py-12 text-gray-500">
					<Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
					<p>No requests found</p>
				</div>
			) : (
				<div className="grid gap-4">
					{filteredRequests.map((req) => (
						<div key={req._id} className="border rounded-lg p-4 bg-white">
							<div className="flex items-start justify-between gap-4 mb-3">
								<div className="flex items-start gap-3 flex-1">
									{req.type === 'delivery_area' ? (
										<MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
									) : (
										<Package className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
									)}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-sm font-medium text-gray-900">
												{req.type === 'delivery_area' ? 'Delivery Area Request' : 'Out of Stock Request'}
											</span>
											<span className={`text-xs px-2 py-0.5 rounded ${
												req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
												req.status === 'approved' ? 'bg-green-100 text-green-800' :
												'bg-red-100 text-red-800'
											}`}>
												{req.status}
											</span>
										</div>
										<div className="text-xs text-gray-500 mt-1">
											{req.userName || 'Guest'} ({req.userEmail})
										</div>
									</div>
								</div>
								<div className="text-xs text-gray-500">
									{new Date(req.createdAt).toLocaleDateString()}
								</div>
							</div>

							{/* Request Details */}
							<div className="mt-3 text-sm text-gray-700 space-y-1">
								{req.type === 'delivery_area' ? (
									<>
										{req.address && <div><strong>Address:</strong> {req.address}</div>}
										{req.city && <div><strong>City:</strong> {req.city}</div>}
										{req.latitude !== undefined && req.longitude !== undefined && (
											<div className="text-xs text-gray-500">
												Coordinates: {req.latitude.toFixed(6)}, {req.longitude.toFixed(6)}
											</div>
										)}
									</>
								) : (
									<>
										{req.productTitle && <div><strong>Product:</strong> {req.productTitle}</div>}
										{req.variantLabel && <div><strong>Variant:</strong> {req.variantLabel}</div>}
									</>
								)}
								{req.notes && <div><strong>Notes:</strong> {req.notes}</div>}
								{req.adminNotes && (
									<div className="mt-2 p-2 bg-gray-50 rounded text-xs">
										<strong>Admin Notes:</strong> {req.adminNotes}
									</div>
								)}
							</div>

							{/* Actions */}
							{req.status === 'pending' && (
								<div className="mt-4 flex items-center gap-2">
									<button
										onClick={() => updateRequestStatus(req._id, 'approved')}
										disabled={updating === req._id}
										className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs font-medium transition-colors flex items-center gap-1"
									>
										<CheckCircle className="h-3 w-3" />
										Approve
									</button>
									<button
										onClick={() => updateRequestStatus(req._id, 'rejected')}
										disabled={updating === req._id}
										className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-xs font-medium transition-colors flex items-center gap-1"
									>
										<XCircle className="h-3 w-3" />
										Reject
									</button>
									{updating === req._id && (
										<span className="text-xs text-gray-500">Updating...</span>
									)}
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}

