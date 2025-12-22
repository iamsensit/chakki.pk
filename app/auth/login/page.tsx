"use client"

import { signIn } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'
import { loginSchema } from '@/app/lib/validators'
import { toast } from 'sonner'
import Link from 'next/link'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { useErrorDialog } from '@/app/contexts/ErrorDialogContext'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
	const { showError } = useErrorDialog()
	const { status } = useSession()
	const router = useRouter()
	const searchParams = useSearchParams()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
	const [loading, setLoading] = useState(false)
	const [unverified, setUnverified] = useState(false)

	// Handle error passed by NextAuth (?error=EMAIL_NOT_VERIFIED)
	useEffect(() => {
		const err = searchParams.get('error')
		if (err && err.toUpperCase().includes('EMAIL_NOT_VERIFIED')) {
			setUnverified(true)
			toast.error('Email not verified. Check your inbox for the code.')
		}
	}, [searchParams, router])

	const validate = () => {
		const result = loginSchema.safeParse({ email, password })
		if (!result.success) {
			const fieldErrors: { email?: string; password?: string } = {}
			result.error.errors.forEach((err) => {
				if (err.path[0] === 'email') fieldErrors.email = err.message
				if (err.path[0] === 'password') fieldErrors.password = err.message
			})
			setErrors(fieldErrors)
			return false
		}
		setErrors({})
		return true
	}

	const handleSubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault()
		if (!validate()) return
		setLoading(true)
		try {
			// Pre-check verification status to avoid hitting NextAuth error path
			const checkRes = await fetch('/api/auth/check-verification', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			})
			const checkJson = await checkRes.json()
			if (checkRes.ok && checkJson?.data?.exists && !checkJson.data.verified) {
				setUnverified(true)
				toast.error('Email not verified. Check your inbox for the code.')
				router.push(`/auth/verify-email?email=${encodeURIComponent(email)}` as any)
				return
			}

			const callbackUrl = searchParams.get('callbackUrl') || '/'
			const result = await signIn('credentials', { email, password, callbackUrl, redirect: false })
			if (result?.error) {
				if (result.error === 'EMAIL_NOT_VERIFIED' || result.error?.includes('not verified')) {
					setUnverified(true)
					toast.error('Email not verified. Check your inbox for the code.')
					router.push(`/auth/verify-email?email=${encodeURIComponent(email)}` as any)
				} else {
					const msg = result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error
					showError(msg, 'Login Failed')
				}
			} else if (result?.ok) {
				window.location.href = callbackUrl
			}
		} catch (error: any) {
			showError(error.message || 'Failed to login', 'Login Error')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
			<div className="w-full max-w-md">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
					<p className="text-sm text-gray-600">Sign in to your account to continue</p>
				</div>

				{/* Login Card */}
				<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Email Input */}
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
								Email Address
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
								<input 
									id="email"
									value={email} 
									onChange={e => { setEmail(e.target.value); setErrors({ ...errors, email: undefined }) }} 
									placeholder="you@example.com" 
									type="email"
									className={`input-enhanced pl-10 max-w-md ${
										errors.email ? 'border-red-500 focus:ring-red-500' : ''
									}`}
								/>
							</div>
							{errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
						</div>

						{/* Password Input */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
									Password
								</label>
								<Link href="/auth/forgot-password" className="text-xs text-brand-accent hover:text-orange-600 transition-colors">
									Forgot password?
								</Link>
							</div>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
								<input 
									id="password"
									type="password" 
									value={password} 
									onChange={e => { setPassword(e.target.value); setErrors({ ...errors, password: undefined }) }} 
									placeholder="Enter your password" 
									className={`input-enhanced pl-10 max-w-md ${
										errors.password ? 'border-red-500 focus:ring-red-500' : ''
									}`}
								/>
							</div>
							{errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
						</div>

						{/* Submit Button */}
						<button 
							type="submit"
							disabled={loading}
							className="btn-large w-full max-w-md animate-fade-in"
						>
							{loading ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									<span>Signing in...</span>
								</>
							) : (
								<>
									<span>Sign In</span>
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</button>
					</form>

					{unverified && (
						<div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
							<div className="font-semibold mb-1">Email not verified</div>
							<p className="mb-3">Verify your email to sign in. We sent you a code/link. You can resend and go to the verification page.</p>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => {
										const url = email ? `/auth/verify-email?email=${encodeURIComponent(email)}` : '/auth/verify-email'
										router.push(url as any)
									}}
									className="inline-flex items-center gap-2 rounded-md bg-brand-accent px-3 py-2 text-white text-sm hover:bg-orange-600"
								>
									Verify now
								</button>
								<button
									type="button"
									onClick={async () => {
										if (!email) {
											toast.error('Enter your email above to resend the code.')
											return
										}
										try {
											const res = await fetch('/api/auth/send-verification', {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({ email })
											})
											const json = await res.json()
											if (!res.ok || !json.success) {
												toast.error(json.message || 'Failed to resend code')
											} else {
												toast.success('Verification email sent')
											}
										} catch (err: any) {
											toast.error(err?.message || 'Failed to resend code')
										}
									}}
									className="inline-flex items-center gap-2 rounded-md border border-amber-300 px-3 py-2 text-amber-800 text-sm hover:bg-amber-100"
								>
									Resend code
								</button>
							</div>
						</div>
					)}

					{/* Divider */}
					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-200"></div>
						</div>
						<div className="relative flex justify-center text-xs">
							<span className="px-2 bg-white text-gray-500">Or continue with</span>
						</div>
					</div>

					{/* Google Sign In */}
					<button 
						onClick={() => {
							const callbackUrl = searchParams.get('callbackUrl') || '/'
							signIn('google', { callbackUrl })
						}} 
						className="w-full border border-gray-300 hover:border-gray-400 bg-white text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-sm"
					>
						<svg className="w-5 h-5" viewBox="0 0 24 24">
							<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
							<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
							<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
							<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
						</svg>
						<span>Continue with Google</span>
					</button>

					{/* Sign Up Link */}
					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600">
							Don't have an account?{' '}
							<Link href="/auth/signup" className="font-medium text-brand-accent hover:text-orange-600 transition-colors">
								Sign up
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function LoginPage() {
	return (
		<Suspense fallback={
			<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
				<div className="w-full max-w-md">
					<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
						<div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
						<p className="mt-4 text-sm text-gray-600">Loading...</p>
					</div>
				</div>
			</div>
		}>
			<LoginForm />
		</Suspense>
	)
}
