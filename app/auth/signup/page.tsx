"use client"

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { signupSchema } from '@/app/lib/validators'
import { toast } from 'sonner'
import Link from 'next/link'
import { User, Mail, Lock, ArrowRight } from 'lucide-react'
import { useErrorDialog } from '@/app/contexts/ErrorDialogContext'

export default function SignupPage() {
	const { showError } = useErrorDialog()
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})
	const [loading, setLoading] = useState(false)

	const validate = () => {
		const result = signupSchema.safeParse({ name, email, password })
		if (!result.success) {
			const fieldErrors: { name?: string; email?: string; password?: string } = {}
			result.error.errors.forEach((err) => {
				if (err.path[0] === 'name') fieldErrors.name = err.message
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
			// First create the user account via API
			const res = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password })
			})
			const json = await res.json()
			
			if (!res.ok || !json.success) {
				showError(json.message || 'Failed to create account', 'Signup Failed')
				return
			}

			// Then sign in with credentials
			const result = await signIn('credentials', { email, password, callbackUrl: '/', redirect: false })
			if (result?.error) {
				showError(result.error === 'CredentialsSignin' ? 'Account created but failed to sign in' : result.error, 'Sign In Failed')
			} else if (result?.ok) {
				toast.success('Account created successfully!')
				window.location.href = '/'
			}
		} catch (error: any) {
			showError(error.message || 'Failed to create account', 'Signup Error')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
			<div className="w-full max-w-md">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
					<p className="text-sm text-gray-600">Sign up to get started with your account</p>
				</div>

				{/* Signup Card */}
				<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Name Input */}
						<div>
							<label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
								Full Name
							</label>
							<div className="relative">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
								<input 
									id="name"
									value={name} 
									onChange={e => { setName(e.target.value); setErrors({ ...errors, name: undefined }) }} 
									placeholder="John Doe" 
									type="text"
									className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
										errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
									}`}
								/>
							</div>
							{errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
						</div>

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
									onChange={e => { setEmail(e.target.value); setErrors({ ...errors, email: undefined }) }} 
									placeholder="you@example.com" 
									type="email"
									className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
										errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
									}`}
								/>
							</div>
							{errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
						</div>

						{/* Password Input */}
						<div>
							<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
								Password
							</label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
								<input 
									id="password"
									type="password" 
									value={password} 
									onChange={e => { setPassword(e.target.value); setErrors({ ...errors, password: undefined }) }} 
									placeholder="Create a strong password" 
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

						{/* Submit Button */}
						<button 
							type="submit"
							disabled={loading}
							className="w-full bg-brand-accent hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
						>
							{loading ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									<span>Creating account...</span>
								</>
							) : (
								<>
									<span>Sign Up</span>
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</button>
					</form>

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
						onClick={() => signIn('google', { callbackUrl: '/' })} 
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

					{/* Login Link */}
					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600">
							Already have an account?{' '}
							<Link href="/auth/login" className="font-medium text-brand-accent hover:text-orange-600 transition-colors">
								Sign in
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
