"use client"

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Save, MailCheck, ShieldCheck, KeyRound, CheckCircle, Trash2, X, AlertTriangle, Phone, Edit2 } from 'lucide-react'
import { changePasswordSchema } from '@/app/lib/validators'
import { signOut } from 'next-auth/react'

export default function AccountClient() {
	const [loading, setLoading] = useState(true)
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [phone, setPhone] = useState('')
	const [emailVerified, setEmailVerified] = useState(false)
	const [token, setToken] = useState('')
	const [submitting, setSubmitting] = useState<{ [k: string]: boolean }>({})
	const [passwordErrors, setPasswordErrors] = useState<{ currentPassword?: string; newPassword?: string }>({})
	const passwordFormRef = useRef<HTMLFormElement>(null)
	const [deleting, setDeleting] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [deletePassword, setDeletePassword] = useState('')
	const [deletePasswordError, setDeletePasswordError] = useState('')
	const [editingPhone, setEditingPhone] = useState(false)
	const [phoneError, setPhoneError] = useState('')
	const [editingName, setEditingName] = useState(false)

	useEffect(() => {
		;(async () => {
			try {
				const res = await fetch('/api/account', { cache: 'no-store' })
				const json = await res.json()
				if (json?.data) {
					setName(json.data.name || '')
					setEmail(json.data.email || '')
					setPhone(json.data.phone || '')
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
			const res = await fetch('/api/account', { 
				method: 'PUT', 
				headers: { 'Content-Type': 'application/json' }, 
				body: JSON.stringify({ name, phone }) 
			})
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
		<motion.div 
			initial={{ opacity: 0, y: 8 }} 
			animate={{ opacity: 1, y: 0 }} 
			transition={{ duration: 0.25 }}
			className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 space-y-8"
		>
			{/* Account Details Section */}
			<div>
				<h2 className="text-xl font-bold text-slate-900 mb-6">Account Details</h2>
				<div className="space-y-5">
					<div>
						<div className="flex items-center justify-between mb-2">
							<label className="block text-sm font-medium text-slate-700">Display</label>
							{!editingName && name && (
								<button
									onClick={() => setEditingName(true)}
									className="text-sm text-brand-accent hover:text-brand flex items-center gap-1.5 font-medium transition-colors"
									title="Edit name"
								>
									<Edit2 className="h-4 w-4" />
								</button>
							)}
						</div>
						<input 
							value={name} 
							onChange={e => setName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && editingName) {
									e.preventDefault();
									// Trigger save button
									const saveButton = document.querySelector('[data-save-name-button]') as HTMLButtonElement;
									if (saveButton) saveButton.click();
								}
							}}
							disabled={!editingName && name !== ''}
							className={`w-full h-[50px]  border border-[#e5e5e5] px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all ${
								!editingName && name ? 'bg-slate-50 cursor-not-allowed' : ''
							}`}
							placeholder="Enter display name"
						/>
						{editingName && (
							<div className="mt-3 flex gap-3">
								<button
									data-save-name-button
									onClick={async () => {
										setSubmitting(s => ({ ...s, profile: true }))
										try {
											const res = await fetch('/api/account', { 
												method: 'PUT', 
												headers: { 'Content-Type': 'application/json' }, 
												body: JSON.stringify({ name }) 
											})
											if (!res.ok) throw new Error('Update failed')
											toast.success('Display name updated')
											setEditingName(false)
										} catch (e: any) {
											toast.error(e.message || 'Could not update display name')
										} finally {
											setSubmitting(s => ({ ...s, profile: false }))
										}
									}}
									disabled={submitting.profile}
									className="inline-flex items-center justify-center gap-2  bg-brand-accent px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity h-[50px] disabled:opacity-50"
								>
									<Save className="h-4 w-4" /> 
									{submitting.profile ? 'Saving...' : 'Save'}
								</button>
								<button
									onClick={() => {
										setEditingName(false)
										// Reset to original value
										fetch('/api/account', { cache: 'no-store' })
											.then(res => res.json())
											.then(json => {
												if (json?.data?.name) {
													setName(json.data.name)
												}
											})
											.catch(() => {})
									}}
									disabled={submitting.profile}
									className="inline-flex items-center justify-center gap-2  border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors h-[50px] disabled:opacity-50"
								>
									Cancel
								</button>
							</div>
						)}
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Email address</label>
						<input 
							value={email} 
							disabled 
							className="w-full h-[50px]  border border-[#e5e5e5] bg-slate-50 px-4 py-3 text-sm text-slate-600 cursor-not-allowed" 
						/>
					</div>
					{!emailVerified && (
						<div className="pt-2">
							<div className="text-sm text-slate-600 mb-3">Send a verification token to confirm your email.</div>
							<div className="flex flex-col sm:flex-row gap-3">
								<button 
									disabled={submitting.verify} 
									onClick={onSendVerify} 
									className="inline-flex items-center justify-center gap-2  border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors h-[50px]"
								>
									<MailCheck className="h-4 w-4" /> 
									{submitting.verify ? 'Sending...' : 'Send verification'}
								</button>
								<input 
									value={token} 
									onChange={e => setToken(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											onVerify();
										}
									}}
									placeholder="Enter token" 
									className="flex-1 h-[50px]  border border-[#e5e5e5] px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all" 
								/>
								<button 
									disabled={submitting.verifyConfirm} 
									onClick={onVerify} 
									className="inline-flex items-center justify-center gap-2  bg-brand-accent px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity h-[50px]"
								>
									<ShieldCheck className="h-4 w-4" /> 
									{submitting.verifyConfirm ? 'Verifying...' : 'Verify'}
								</button>
							</div>
						</div>
					)}
					{emailVerified && (
						<div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200  px-4 py-3">
							<CheckCircle className="h-4 w-4" />
							<span>Your email is verified.</span>
						</div>
					)}
				</div>
			</div>

			{/* Password Change Section */}
			<div className="pt-8 border-t border-slate-200">
				<h2 className="text-xl font-bold text-slate-900 mb-6">Password change</h2>
				<form 
					ref={passwordFormRef} 
					onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); onChangePassword(fd) }} 
					className="space-y-5"
				>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
						<input 
							name="currentPassword" 
							type="password" 
							className={`w-full h-[50px]  border px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all ${
								passwordErrors.currentPassword ? 'border-red-500' : 'border-[#e5e5e5]'
							}`}
							placeholder="Enter current password"
							onChange={() => setPasswordErrors({ ...passwordErrors, currentPassword: undefined })}
						/>
						{passwordErrors.currentPassword && (
							<div className="mt-2 text-xs text-red-600">{passwordErrors.currentPassword}</div>
						)}
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
						<input 
							name="newPassword" 
							type="password" 
							className={`w-full h-[50px]  border px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all ${
								passwordErrors.newPassword ? 'border-red-500' : 'border-[#e5e5e5]'
							}`}
							placeholder="Enter new password"
							onChange={() => setPasswordErrors({ ...passwordErrors, newPassword: undefined })}
						/>
						{passwordErrors.newPassword && (
							<div className="mt-2 text-xs text-red-600">{passwordErrors.newPassword}</div>
						)}
						{!passwordErrors.newPassword && (
							<div className="mt-2 text-xs text-slate-500">
								Must be at least 8 characters with uppercase, lowercase, number, and special character.
							</div>
						)}
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
						<input 
							name="confirmPassword" 
							type="password" 
							className="w-full h-[50px]  border border-[#e5e5e5] px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all" 
							placeholder="Confirm new password"
						/>
					</div>
					<button 
						disabled={submitting.password} 
						className="inline-flex items-center justify-center gap-2  bg-brand-accent px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity h-[50px]"
					>
						<Save className="h-4 w-4" /> 
						{submitting.password ? 'Updating...' : 'Save Change'}
					</button>
				</form>
			</div>

			{/* Phone Number Section */}
			<div className="pt-8 border-t border-slate-200">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-xl font-bold text-slate-900">Phone Number</h2>
					{!editingPhone && phone && (
						<button
							onClick={() => setEditingPhone(true)}
							className="text-sm text-brand-accent hover:text-orange-600 flex items-center gap-1.5 font-medium transition-colors"
							title="Edit phone number"
						>
							<Edit2 className="h-4 w-4" />
						</button>
					)}
				</div>
				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
					<input 
						type="tel"
						value={phone} 
						onChange={(e) => {
							const value = e.target.value
							const cleanedValue = value.replace(/[^0-9]/g, '')
							setPhone(cleanedValue)
							setPhoneError('')
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && editingPhone) {
								e.preventDefault();
								// Trigger save button
								const saveButton = document.querySelector('[data-save-phone-button]') as HTMLButtonElement;
								if (saveButton) saveButton.click();
							}
						}}
						disabled={!editingPhone && phone !== ''}
						className={`w-full h-[50px]  border px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all ${
							phoneError ? 'border-red-500' : 'border-[#e5e5e5]'
						} ${!editingPhone && phone ? 'bg-slate-50 cursor-not-allowed' : ''}`}
						placeholder="e.g., 03001234567"
					/>
					{phoneError && <p className="mt-2 text-xs text-red-600">{phoneError}</p>}
					{!phoneError && <p className="mt-2 text-xs text-slate-500">Your phone number will be used for order delivery</p>}
					{editingPhone && (
						<div className="mt-4 flex gap-3">
							<button
								data-save-phone-button
								onClick={async () => {
									if (!phone.trim()) {
										setPhoneError('Phone number is required')
										return
									}
									if (phone.trim().length < 7) {
										setPhoneError('Phone number must be at least 7 digits')
										return
									}
									if (!/^[0-9]+$/.test(phone.trim())) {
										setPhoneError('Phone number should contain only numbers')
										return
									}
									
									setSubmitting(s => ({ ...s, phone: true }))
									try {
										const res = await fetch('/api/account', { 
											method: 'PUT', 
											headers: { 'Content-Type': 'application/json' }, 
											body: JSON.stringify({ phone: phone.trim() }) 
										})
										if (!res.ok) throw new Error('Update failed')
										toast.success('Phone number updated')
										setEditingPhone(false)
										setPhoneError('')
									} catch (e: any) {
										toast.error(e.message || 'Could not update phone number')
									} finally {
										setSubmitting(s => ({ ...s, phone: false }))
									}
								}}
								disabled={submitting.phone}
								className="inline-flex items-center justify-center gap-2  bg-brand-accent px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity h-[50px] disabled:opacity-50"
							>
								<Save className="h-4 w-4" /> 
								{submitting.phone ? 'Saving...' : 'Save'}
							</button>
							<button
								onClick={() => {
									setEditingPhone(false)
									setPhoneError('')
									fetch('/api/account', { cache: 'no-store' })
										.then(res => res.json())
										.then(json => {
											if (json?.data?.phone) {
												setPhone(json.data.phone)
											}
										})
										.catch(() => {})
								}}
								disabled={submitting.phone}
								className="inline-flex items-center justify-center gap-2  border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors h-[50px] disabled:opacity-50"
							>
								Cancel
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Delete Account Section */}
			<div className="pt-8 border-t border-slate-200">
				<div className="text-sm font-medium flex items-center gap-2 text-red-700 mb-3">
					<Trash2 className="h-4 w-4" /> 
					Delete account
				</div>
				<div className="bg-red-50 border border-red-200  p-4 mb-4">
					<p className="text-sm font-medium text-red-900 mb-2">⚠️ This action cannot be undone</p>
					<p className="text-sm text-red-800 mb-2">Deleting your account will permanently remove:</p>
					<ul className="text-xs text-red-700 list-disc list-inside space-y-1 mb-2">
						<li>Login credentials (email, password)</li>
						<li>Profile information (name, phone number, profile picture)</li>
						<li>Saved payment methods</li>
						<li>Shipping and delivery addresses</li>
						<li>Wishlist and saved cart items</li>
						<li>Product reviews</li>
					</ul>
					<p className="text-xs text-red-600">Order history will be anonymized for legal compliance.</p>
				</div>
				<button
					disabled={deleting}
					onClick={onDeleteAccount}
					className="inline-flex items-center gap-2  border border-red-300 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
				>
					<Trash2 className="h-4 w-4" /> 
					Delete my account
				</button>
			</div>

			{/* Delete Account Confirmation Dialog */}
			{showDeleteDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deleting && setShowDeleteDialog(false)}>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						onClick={(e) => e.stopPropagation()}
						className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 space-y-4"
					>
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
								<AlertTriangle className="h-5 w-5 text-red-600" />
							</div>
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Account</h3>
								<div className="bg-red-50 border border-red-200  p-3 mb-4">
									<p className="text-sm font-medium text-red-900 mb-2">⚠️ This action cannot be undone</p>
									<p className="text-xs text-red-800 mb-1">The following will be permanently deleted:</p>
									<ul className="text-xs text-red-700 list-disc list-inside space-y-0.5 mb-2">
										<li>Login credentials, profile info, payment methods</li>
										<li>Shipping addresses, wishlist, cart, reviews</li>
									</ul>
									<p className="text-xs text-red-600">Order history will be anonymized for compliance.</p>
								</div>
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
											className={`w-full h-[50px]  border px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${
												deletePasswordError ? 'border-red-500' : 'border-[#e5e5e5]'
											}`}
											autoFocus
										/>
										{deletePasswordError && (
											<p className="mt-1 text-xs text-red-600">{deletePasswordError}</p>
										)}
										<p className="mt-2 text-xs text-gray-500">
											You will receive a confirmation email after deletion is complete.
										</p>
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
								className="px-6 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300  hover:bg-slate-50 transition-colors disabled:opacity-50 h-[50px]"
							>
								Cancel
							</button>
							<button
								onClick={confirmDeleteAccount}
								disabled={deleting || !deletePassword.trim()}
								className="px-6 py-3 text-sm font-medium text-white bg-red-600  hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-[50px]"
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
		</motion.div>
	)
}
