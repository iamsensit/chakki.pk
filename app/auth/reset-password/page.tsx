"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { passwordSchema } from '@/app/lib/validators'
import { toast } from 'sonner'
import Link from 'next/link'
import { Lock, ArrowRight, ArrowLeft } from 'lucide-react'

function ResetPasswordContent() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const token = searchParams.get('token')
	const email = searchParams.get('email')
	
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
	const [loading, setLoading] = useState(false)
	const [validating, setValidating] = useState(true)
	const [valid, setValid] = useState(false)

	// Validate token on mount
	useEffect(() => {
		if (!token || !email) {
			setValidating(false)
			setValid(false)
			return
		}

		async function validateToken() {
			try {
				const res = await fetch('/api/auth/reset-password/validate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ token, email })
				})
				const json = await res.json()
				
				if (res.ok && json.success) {
					setValid(true)
				} else {
					setValid(false)
					toast.error(json.message || 'Invalid or expired reset link')
				}
			} catch (error: any) {
				setValid(false)
				toast.error('Failed to validate reset link')
			} finally {
				setValidating(false)
			}
		}

		validateToken()
	}, [token, email])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setErrors({})

		// Validate password
		const passwordResult = passwordSchema.safeParse(password)
		if (!passwordResult.success) {
			setErrors({ password: passwordResult.error.errors[0].message })
			return
		}

		// Validate passwords match
		if (password !== confirmPassword) {
			setErrors({ confirmPassword: 'Passwords do not match' })
			return
		}

		setLoading(true)
		try {
			const res = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, email, password })
			})
			const json = await res.json()

			if (!res.ok || !json.success) {
				toast.error(json.message || 'Failed to reset password')
				setErrors({ password: json.message || 'Failed to reset password' })
			} else {
				toast.success('Password reset successfully!')
				router.push('/auth/login')
			}
		} catch (error: any) {
			toast.error(error.message || 'Failed to reset password')
			setErrors({ password: error.message || 'Failed to reset password' })
		} finally {
			setLoading(false)
		}
	}

	if (validating) {
		return (
			<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
				<div className="w-full max-w-md">
					<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
						<div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p className="text-sm text-gray-600">Validating reset link...</p>
					</div>
				</div>
			</div>
		)
	}

	if (!valid) {
		return (
			<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
				<div className="w-full max-w-md">
					<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
						<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<Lock className="h-8 w-8 text-red-600" />
						</div>
						<h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
						<p className="text-sm text-gray-600 mb-6">
							This password reset link is invalid or has expired. Please request a new one.
						</p>
						<Link
							href="/auth/forgot-password"
							className="inline-flex items-center gap-2 text-sm font-medium text-brand-accent hover:text-orange-600 transition-colors"
						>
							Request New Reset Link
						</Link>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
			<div className="w-full max-w-md">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
					<p className="text-sm text-gray-600">Enter your new password below</p>
				</div>

				{/* Reset Password Card */}
				<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* New Password Input */}
						<div>
							<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
								New Password
							</label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
								<input 
									id="password"
									type="password" 
									value={password} 
									onChange={e => { setPassword(e.target.value); setErrors({ ...errors, password: undefined }) }} 
									placeholder="Enter new password" 
									className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
										errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
									}`}
								/>
							</div>
							{errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
							{!errors.password && password && (
								<p className="mt-1.5 text-xs text-gray-500">
									Must be at least 8 characters with uppercase, lowercase, number, and special character.
								</p>
							)}
						</div>

						{/* Confirm Password Input */}
						<div>
							<label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
								Confirm New Password
							</label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
								<input 
									id="confirmPassword"
									type="password" 
									value={confirmPassword} 
									onChange={e => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: undefined }) }} 
									placeholder="Confirm new password" 
									className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
										errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
									}`}
								/>
							</div>
							{errors.confirmPassword && <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>}
						</div>

						{/* Submit Button */}
						<button 
							type="submit"
							disabled={loading}
							className="w-full bg-brand-accent hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
						>
							{loading ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									<span>Resetting...</span>
								</>
							) : (
								<>
									<span>Reset Password</span>
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</button>
					</form>

					{/* Back to Login Link */}
					<div className="mt-6 text-center">
						<Link 
							href="/auth/login" 
							className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Sign In
						</Link>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={
			<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
				<div className="w-full max-w-md">
					<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
						<div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p className="text-sm text-gray-600">Loading...</p>
					</div>
				</div>
			</div>
		}>
			<ResetPasswordContent />
		</Suspense>
	)
}

