"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { signIn } from 'next-auth/react'

function VerifyEmailForm() {
	const search = useSearchParams()
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [code, setCode] = useState('')
	const [loading, setLoading] = useState(false)
	const [verified, setVerified] = useState(false)
	const [sending, setSending] = useState(false)

	useEffect(() => {
		const e = search.get('email') || ''
		const t = search.get('token') || ''
		if (e) setEmail(e)
		if (t) setCode(t)
	}, [search])

	const handleSubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault()
		if (!email || !code) {
			toast.error('Email and code are required')
			return
		}
		setLoading(true)
		try {
			const res = await fetch('/api/auth/verify-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, token: code })
			})
			const json = await res.json()
			if (!res.ok || !json.success) {
				toast.error(json.message || 'Verification failed')
				return
			}
			setVerified(true)
			toast.success('Email verified! You can now sign in.')
			const callbackUrl = search.get('callbackUrl') || '/'
			setTimeout(() => router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`), 1000)
		} catch (err: any) {
			toast.error(err.message || 'Verification failed')
		} finally {
			setLoading(false)
		}
	}

	const resend = async () => {
		if (!email) {
			toast.error('Enter your email to resend the code')
			return
		}
		setSending(true)
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
			toast.error(err.message || 'Failed to resend code')
		} finally {
			setSending(false)
		}
	}

	if (verified) {
		return (
			<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
				<div className="w-full max-w-md">
					<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
						<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<CheckCircle2 className="h-8 w-8 text-green-600" />
						</div>
						<h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified</h1>
						<p className="text-sm text-gray-600">Redirecting to sign in...</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
					<p className="text-sm text-gray-600">Enter the verification code sent to your email.</p>
				</div>

				<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
								<input
									type="email"
									value={email}
									onChange={e => setEmail(e.target.value)}
									placeholder="you@example.com"
									className="w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
							<input
								type="text"
								value={code}
								onChange={e => setCode(e.target.value)}
								placeholder="Enter the code"
								className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
							/>
						</div>
						<button
							type="submit"
							disabled={loading}
							className="w-full bg-brand-accent hover:bg-brand text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
						>
							{loading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>Verifying...</span>
								</>
							) : (
								<span>Verify</span>
							)}
						</button>
						<button
							type="button"
							disabled={sending}
							onClick={resend}
							className="w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Resend code</span>}
						</button>
					</form>
					<p className="mt-6 text-xs text-gray-500 text-center">
						Didn&apos;t get the email? Check your spam folder or resend the code.
					</p>
				</div>
			</div>
		</div>
	)
}

export default function VerifyEmailPage() {
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
			<VerifyEmailForm />
		</Suspense>
	)
}

