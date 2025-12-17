"use client"

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Save, MailCheck, ShieldCheck, KeyRound, CheckCircle, Trash2, X, AlertTriangle } from 'lucide-react'
import { changePasswordSchema } from '@/app/lib/validators'
import { signOut } from 'next-auth/react'

export default function AccountClient() {
	const [loading, setLoading] = useState(true)
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [emailVerified, setEmailVerified] = useState(false)
	const [token, setToken] = useState('')
	const [submitting, setSubmitting] = useState<{ [k: string]: boolean }>({})
	const [passwordErrors, setPasswordErrors] = useState<{ currentPassword?: string; newPassword?: string }>({})
	const passwordFormRef = useRef<HTMLFormElement>(null)
	const [deleting, setDeleting] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [deletePassword, setDeletePassword] = useState('')
	const [deletePasswordError, setDeletePasswordError] = useState('')

	useEffect(() => {
		;(async () => {
			try {
				const res = await fetch('/api/account', { cache: 'no-store' })
				const json = await res.json()
				if (json?.data) {
					setName(json.data.name || '')
					setEmail(json.data.email || '')
					setEmailVerified(!!json.data.emailVerified)
				}
			} catch (e) {
				toast.error('Failed to load profile')
			} finally {
				setLoading(false)
			}
		})()
	}, [])

	async function onSaveProfile() {
		setSubmitting(s => ({ ...s, profile: true }))
		try {
			const res = await fetch('/api/account', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
			if (!res.ok) throw new Error('Update failed')
			toast.success('Profile updated')
		} catch (e: any) {
			toast.error(e.message || 'Could not update profile')
		} finally {
			setSubmitting(s => ({ ...s, profile: false }))
		}
	}

	async function onSendVerify() {
		setSubmitting(s => ({ ...s, verify: true }))
		try {
			const res = await fetch('/api/account/verify-email', { method: 'POST' })
			const json = await res.json()
			if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to send verification')
			if (json?.data?.token) toast.message(`Dev token: ${json.data.token}`)
			toast.success('Verification sent')
		} catch (e: any) {
			toast.error(e.message || 'Could not send verification')
		} finally {
			setSubmitting(s => ({ ...s, verify: false }))
		}
	}

	async function onVerify() {
		setSubmitting(s => ({ ...s, verifyConfirm: true }))
		try {
			const res = await fetch('/api/account/verify-email/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
			if (!res.ok) throw new Error('Invalid token')
			setEmailVerified(true)
			setToken('')
			toast.success('Email verified')
		} catch (e: any) {
			toast.error(e.message || 'Verification failed')
		} finally {
			setSubmitting(s => ({ ...s, verifyConfirm: false }))
		}
	}

	async function onChangePassword(form: FormData) {
		setSubmitting(s => ({ ...s, password: true }))
		setPasswordErrors({})
		try {
			const currentPassword = form.get('currentPassword') as string
			const newPassword = form.get('newPassword') as string
			
			// Validate on client side
			const result = changePasswordSchema.safeParse({ currentPassword, newPassword })
			if (!result.success) {
				const fieldErrors: { currentPassword?: string; newPassword?: string } = {}
				result.error.errors.forEach((err) => {
					if (err.path[0] === 'currentPassword') fieldErrors.currentPassword = err.message
					if (err.path[0] === 'newPassword') fieldErrors.newPassword = err.message
				})
				setPasswordErrors(fieldErrors)
				return
			}

			const res = await fetch('/api/account/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
				currentPassword,
				newPassword
			}) })
			const json = await res.json()
			if (!res.ok) {
				if (json?.errors) {
					setPasswordErrors(json.errors)
				}
				throw new Error(json?.message || 'Password change failed')
			}
			passwordFormRef.current?.reset()
			setPasswordErrors({})
			toast.success('Password updated')
		} catch (e: any) {
			toast.error(e.message || 'Could not change password')
		} finally {
			setSubmitting(s => ({ ...s, password: false }))
		}
	}

	async function onDeleteAccount() {
		setShowDeleteDialog(true)
		setDeletePassword('')
		setDeletePasswordError('')
	}

	async function confirmDeleteAccount() {
		if (!deletePassword.trim()) {
			setDeletePasswordError('Password is required')
			return
		}
		
		setDeleting(true)
		setDeletePasswordError('')
		try {
			const res = await fetch('/api/account', { 
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: deletePassword })
			})
			const json = await res.json()
			if (!res.ok || !json?.success) {
				if (json?.errors?.password) {
					setDeletePasswordError(json.errors.password)
				} else {
					throw new Error(json?.message || 'Delete failed')
				}
				return
			}
			toast.success('Account deleted')
			await signOut({ callbackUrl: '/' })
		} catch (e: any) {
			toast.error(e.message || 'Could not delete account')
		} finally {
			setDeleting(false)
		}
	}

	if (loading) return <div className="skeleton h-48" />

	return (
		<div className="mx-auto w-full max-w-4xl grid gap-6 lg:grid-cols-2">
			<motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-md border p-4 space-y-3 bg-white">
				<div className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Profile</div>
				<div>
					<label className="text-sm">Name</label>
					<input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
				</div>
				<div>
					<label className="text-sm">Email</label>
					<input value={email} disabled className="mt-1 w-full rounded-md border bg-gray-50 px-3 py-2 text-sm" />
				</div>
				<button disabled={submitting.profile} onClick={onSaveProfile} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-1.5 text-white text-sm hover:opacity-90">
					<Save className="h-4 w-4" /> {submitting.profile ? 'Saving...' : 'Save changes'}
				</button>
			</motion.section>

			<motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="rounded-md border p-4 space-y-3 bg-white">
				<div className="text-sm font-medium flex items-center gap-2"><MailCheck className="h-4 w-4" /> Email verification</div>
				{emailVerified ? (
					<div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
						<CheckCircle className="h-4 w-4" />
						<span>Your email is verified.</span>
					</div>
				) : (
					<>
						<div className="text-sm text-slate-600">Send a verification token to confirm your email.</div>
						<div className="flex flex-col sm:flex-row gap-2">
							<button disabled={submitting.verify} onClick={onSendVerify} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 w-full sm:w-auto">
								<MailCheck className="h-4 w-4" /> {submitting.verify ? 'Sending...' : 'Send verification'}
							</button>
							<input value={token} onChange={e => setToken(e.target.value)} placeholder="Enter token" className="flex-1 rounded-md border px-3 py-1.5 text-sm w-full" />
							<button disabled={submitting.verifyConfirm} onClick={onVerify} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-1.5 text-white text-sm hover:opacity-90 w-full sm:w-auto">
								<ShieldCheck className="h-4 w-4" /> {submitting.verifyConfirm ? 'Verifying...' : 'Verify'}
							</button>
						</div>
					</>
				)}
			</motion.section>

			<motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="rounded-md border p-4 space-y-3 lg:col-span-2 bg-white">
				<div className="text-sm font-medium flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change password</div>
				<form ref={passwordFormRef} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); onChangePassword(fd) }} className="grid gap-4 sm:grid-cols-2">
					<div>
						<label className="text-sm">Current password</label>
						<input 
							name="currentPassword" 
							type="password" 
							className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${passwordErrors.currentPassword ? 'border-red-500' : ''}`}
							onChange={() => setPasswordErrors({ ...passwordErrors, currentPassword: undefined })}
						/>
						{passwordErrors.currentPassword && <div className="mt-1 text-xs text-red-600">{passwordErrors.currentPassword}</div>}
					</div>
					<div>
						<label className="text-sm">New password</label>
						<input 
							name="newPassword" 
							type="password" 
							className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${passwordErrors.newPassword ? 'border-red-500' : ''}`}
							onChange={() => setPasswordErrors({ ...passwordErrors, newPassword: undefined })}
						/>
						{passwordErrors.newPassword && <div className="mt-1 text-xs text-red-600">{passwordErrors.newPassword}</div>}
						{!passwordErrors.newPassword && (
							<div className="mt-1 text-xs text-slate-500">
								Must be at least 8 characters with uppercase, lowercase, number, and special character.
							</div>
						)}
					</div>
					<div className="sm:col-span-2">
						<button disabled={submitting.password} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-1.5 text-white text-sm hover:opacity-90">
							<Save className="h-4 w-4" /> {submitting.password ? 'Updating...' : 'Update password'}
						</button>
					</div>
				</form>
			</motion.section>

			<motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }} className="rounded-md border p-4 space-y-3 lg:col-span-2 bg-white">
				<div className="text-sm font-medium flex items-center gap-2 text-red-700"><Trash2 className="h-4 w-4" /> Delete account</div>
				<p className="text-sm text-slate-600">This will delete your account data and sign you out. This action cannot be undone.</p>
				<button
					disabled={deleting}
					onClick={onDeleteAccount}
					className="inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
				>
					<Trash2 className="h-4 w-4" /> Delete my account
				</button>
			</motion.section>

			{/* Delete Account Confirmation Dialog */}
			{showDeleteDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deleting && setShowDeleteDialog(false)}>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						onClick={(e) => e.stopPropagation()}
						className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
					>
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
								<AlertTriangle className="h-5 w-5 text-red-600" />
							</div>
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Account</h3>
								<p className="text-sm text-gray-600 mb-4">
									This action cannot be undone. This will permanently delete your account, orders, and all associated data.
								</p>
								<div className="space-y-3">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Enter your password to confirm
										</label>
										<input
											type="password"
											value={deletePassword}
											onChange={(e) => {
												setDeletePassword(e.target.value)
												setDeletePasswordError('')
											}}
											placeholder="Current password"
											disabled={deleting}
											className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
												deletePasswordError ? 'border-red-500' : 'border-gray-300'
											}`}
											autoFocus
										/>
										{deletePasswordError && (
											<p className="mt-1 text-xs text-red-600">{deletePasswordError}</p>
										)}
									</div>
								</div>
							</div>
							<button
								onClick={() => !deleting && setShowDeleteDialog(false)}
								disabled={deleting}
								className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="flex gap-3 justify-end pt-4 border-t">
							<button
								onClick={() => setShowDeleteDialog(false)}
								disabled={deleting}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={confirmDeleteAccount}
								disabled={deleting || !deletePassword.trim()}
								className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{deleting ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
										Deleting...
									</>
								) : (
									<>
										<Trash2 className="h-4 w-4" />
										Delete Account
									</>
								)}
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</div>
	)
}
