"use client"

import useSWR from 'swr'
import { useState } from 'react'
import { UserPlus, UserMinus, Mail, Shield, ShieldCheck, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AdminUsersPage() {
	const { data, mutate, isLoading } = useSWR('/api/admin/users', fetcher)
	const [searchQuery, setSearchQuery] = useState('')
	const [grantEmail, setGrantEmail] = useState('')
	const [busy, setBusy] = useState<string>('')
	const users = data?.data || []

	const filteredUsers = users.filter((u: any) => {
		if (!searchQuery.trim()) return true
		const query = searchQuery.toLowerCase()
		const email = (u.email || '').toLowerCase()
		const name = (u.name || '').toLowerCase()
		return email.includes(query) || name.includes(query)
	})

	async function updateUserRole(email: string, action: 'grant' | 'revoke') {
		setBusy(email)
		try {
			const res = await fetch('/api/admin/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, action })
			})
			const json = await res.json()

			if (!res.ok || !json.success) {
				throw new Error(json.message || 'Failed to update')
			}

			toast.success(`Admin access ${action === 'grant' ? 'granted' : 'revoked'}`)
			await mutate()
			if (action === 'grant') {
				setGrantEmail('')
			}
		} catch (e: any) {
			console.error('Update user role error:', e)
			toast.error(e.message || 'Update failed')
		} finally {
			setBusy('')
		}
	}

	return (
		<div className="container-pg py-8">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-slate-900 mb-2">User Management</h1>
				<p className="text-slate-600">Manage user accounts and admin access</p>
			</div>

			{/* Grant Admin Access */}
			<div className="card-enhanced p-6 mb-6">
				<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<ShieldCheck className="h-5 w-5" />
					Grant Admin Access
				</h2>
				<div className="flex gap-3">
					<input
						type="email"
						value={grantEmail}
						onChange={(e) => setGrantEmail(e.target.value)}
						placeholder="Enter user email address"
						className="input-enhanced flex-1"
					/>
					<button
						onClick={() => {
							if (!grantEmail.trim()) {
								toast.error('Please enter an email address')
								return
							}
							updateUserRole(grantEmail.trim(), 'grant')
						}}
						disabled={busy === grantEmail.trim() || !grantEmail.trim()}
						className="btn-primary"
					>
						<UserPlus className="h-4 w-4" />
						Grant Sub-Admin
					</button>
				</div>
			</div>

			{/* Search */}
			<div className="mb-6 relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search by name or email..."
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

			{/* Users List */}
			{isLoading ? (
				<div className="space-y-4">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="skeleton h-20 rounded-xl" />
					))}
				</div>
			) : filteredUsers.length === 0 ? (
				<div className="card-enhanced p-12 text-center">
					<Mail className="h-12 w-12 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600">
						{searchQuery ? 'No users found matching your search.' : 'No users found.'}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{filteredUsers.map((user: any, idx: number) => (
						<motion.div
							key={user._id || user.email}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: idx * 0.05 }}
							className="card-enhanced p-6"
						>
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<h3 className="text-lg font-semibold text-slate-900">{user.name || 'No name'}</h3>
										{user.role === 'ADMIN' ? (
											<span className="badge-status badge-confirmed">
												<Shield className="h-3.5 w-3.5" />
												Primary Admin
											</span>
										) : user.role === 'CADMIN' ? (
											<span className="badge-status bg-blue-50 text-blue-700 border-blue-200">
												<ShieldCheck className="h-3.5 w-3.5" />
												Sub-Admin
											</span>
										) : (
											<span className="badge-status bg-slate-50 text-slate-700 border-slate-200">
												<UserPlus className="h-3.5 w-3.5" />
												User
											</span>
										)}
										{user.emailVerified ? (
											<span className="badge-status bg-emerald-50 text-emerald-700 border-emerald-200">
												Verified
											</span>
										) : (
											<span className="badge-status bg-amber-50 text-amber-700 border-amber-200">
												Unverified
											</span>
										)}
									</div>
									<div className="flex items-center gap-4 text-sm text-slate-600">
										<div className="flex items-center gap-1.5">
											<Mail className="h-4 w-4" />
											{user.email}
										</div>
										<div>
											Joined: {new Date(user.createdAt).toLocaleDateString()}
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									{user.role === 'ADMIN' ? (
										<span className="text-sm text-slate-500">Primary Admin (cannot be changed)</span>
									) : user.role === 'CADMIN' ? (
										<button
											disabled={busy === user.email}
											onClick={() => updateUserRole(user.email, 'revoke')}
											className="btn-secondary text-red-600 hover:text-red-700 hover:border-red-300"
										>
											<UserMinus className="h-4 w-4" />
											Revoke Admin
										</button>
									) : (
										<button
											disabled={busy === user.email}
											onClick={() => updateUserRole(user.email, 'grant')}
											className="btn-secondary text-emerald-600 hover:text-emerald-700 hover:border-emerald-300"
										>
											<ShieldCheck className="h-4 w-4" />
											Grant Sub-Admin
										</button>
									)}
								</div>
							</div>
						</motion.div>
					))}
				</div>
			)}
		</div>
	)
}

