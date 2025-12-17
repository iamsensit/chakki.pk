"use client"

import { useState } from 'react'
import { emailSchema } from '@/app/lib/validators'
import { toast } from 'sonner'
import Link from 'next/link'
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const [sent, setSent] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')

		// Validate email
		const result = emailSchema.safeParse(email)
		if (!result.success) {
			setError(result.error.errors[0].message)
			return
		}

		setLoading(true)
		try {
			const res = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			})
			const json = await res.json()

			if (!res.ok || !json.success) {
				toast.error(json.message || 'Failed to send reset email')
				setError(json.message || 'Failed to send reset email')
			} else {
				setSent(true)
				toast.success('Password reset email sent! Check your inbox.')
			}
		} catch (error: any) {
			toast.error(error.message || 'Failed to send reset email')
			setError(error.message || 'Failed to send reset email')
		} finally {
			setLoading(false)
		}
	}

	if (sent) {
		return (
			<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
				<div className="w-full max-w-md">
					<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
						<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<Mail className="h-8 w-8 text-green-600" />
						</div>
						<h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
						<p className="text-sm text-gray-600 mb-6">
							We've sent a password reset link to <strong>{email}</strong>
						</p>
						<p className="text-xs text-gray-500 mb-6">
							Please check your inbox and click on the link to reset your password. If you don't see it, check your spam folder.
						</p>
						<Link
							href="/auth/login"
							className="inline-flex items-center gap-2 text-sm font-medium text-brand-accent hover:text-orange-600 transition-colors"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Sign In
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
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
					<p className="text-sm text-gray-600">Enter your email address and we'll send you a link to reset your password</p>
				</div>

				{/* Forgot Password Card */}
				<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Email Input */}
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
								Email Address
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
								<input 
									id="email"
									value={email} 
									onChange={e => { setEmail(e.target.value); setError('') }} 
									placeholder="you@example.com" 
									type="email"
									className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
										error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
									}`}
								/>
							</div>
							{error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
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
									<span>Sending...</span>
								</>
							) : (
								<>
									<span>Send Reset Link</span>
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

