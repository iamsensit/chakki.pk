"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Stepper from '@/app/components/checkout/Stepper'
import { useCartStore, cartTotal } from '@/store/cart'
import { formatCurrencyPKR } from '@/app/lib/price'
import { useSession, signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { useErrorDialog } from '@/app/contexts/ErrorDialogContext'

export default function CheckoutPage() {
	const { showError } = useErrorDialog()
	const { data: session } = useSession()
	const router = useRouter()
	const { items, clear } = useCartStore()
	const [step, setStep] = useState(0)
	const [method, setMethod] = useState<'COD' | 'JAZZCASH'>('COD')
	const [form, setForm] = useState({ name: '', phone: '', address: '', city: '' })
	const [loading, setLoading] = useState(false)
	const [orderId, setOrderId] = useState<string | null>(null)
	const [jcInstruction, setJcInstruction] = useState<{ id: string; account: string; amount: number; message: string } | null>(null)
	const [paymentReference, setPaymentReference] = useState('')
	const [paymentProofDataUrl, setPaymentProofDataUrl] = useState('')
	const [proofError, setProofError] = useState('')
	const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string; city?: string; paymentReference?: string }>({})
	const [userDeliveryLocation, setUserDeliveryLocation] = useState<{ address: string; city: string; latitude?: number; longitude?: number } | null>(null)
	const [userProfile, setUserProfile] = useState<{ name: string; email: string; phone?: string } | null>(null)
	const [redirectCountdown, setRedirectCountdown] = useState(4)
	const [locationLoading, setLocationLoading] = useState(true)

	const subtotal = cartTotal(items)

	// Load user profile and delivery location
	useEffect(() => {
		if (session?.user?.email) {
			setLocationLoading(true)
			Promise.all([
				fetch('/api/account', { cache: 'no-store' }).then(res => res.json()),
				fetch('/api/user-delivery-location', { cache: 'no-store' }).then(res => res.json())
			])
				.then(([profileJson, locationJson]) => {
					// Load user profile
					if (profileJson.success && profileJson.data) {
						setUserProfile({
							name: profileJson.data.name || '',
							email: profileJson.data.email || '',
							phone: profileJson.data.phone
						})
						// Pre-fill name
						setForm(prev => ({
							...prev,
							name: profileJson.data.name || prev.name
						}))
					}
					
					// Load delivery location
					if (locationJson.success && locationJson.data) {
						setUserDeliveryLocation({
							address: locationJson.data.address || '',
							city: locationJson.data.city || '',
							latitude: locationJson.data.latitude,
							longitude: locationJson.data.longitude
						})
						// Pre-fill address and city from saved location
						setForm(prev => ({
							...prev,
							address: locationJson.data.address || prev.address,
							city: locationJson.data.city || prev.city
						}))
					}
				})
				.catch(() => {})
				.finally(() => setLocationLoading(false))
		} else {
			setLocationLoading(false)
		}
	}, [session])

	// Auto-redirect after order confirmation
	useEffect(() => {
		if (step === 2 && orderId) {
			const interval = setInterval(() => {
				setRedirectCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(interval)
						router.push('/products')
						return 0
					}
					return prev - 1
				})
			}, 1000)

			return () => clearInterval(interval)
		}
	}, [step, orderId, router])

	useEffect(() => {
		if (method === 'JAZZCASH') {
			;(async () => {
				try {
					const res = await fetch('/api/payments/jazzcash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: subtotal, orderId: 'pending' }) })
					const json = await res.json()
					if (json?.success) setJcInstruction(json.data)
					else showError(json?.message || 'Failed to load JazzCash instructions', 'Loading Error')
			} catch {
				showError('Failed to load JazzCash instructions', 'Loading Error')
				}
			})()
		}
	}, [method, subtotal])

	function approxBytesFromDataUrl(dataUrl: string) {
		const comma = dataUrl.indexOf(',')
		const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
		return Math.floor(b64.length * 0.75)
	}

	async function placeOrder() {
		// Check if location is selected
		if (!userDeliveryLocation) {
			showError('Please select your delivery location first', 'Location Required')
			router.push('/change-location?redirect=/checkout')
			return
		}
		
		// Validate form
		const errors: { name?: string; phone?: string; address?: string; city?: string; paymentReference?: string } = {}
		if (!form.name.trim() || form.name.trim().length < 2) {
			errors.name = 'Name must be at least 2 characters'
		}
		if (!form.phone.trim() || form.phone.trim().length < 7) {
			errors.phone = 'Phone must be at least 7 characters'
		}
		// Address and city come from saved location, but validate they exist
		if (!userDeliveryLocation.address || userDeliveryLocation.address.trim().length < 6) {
			errors.address = 'Please update your delivery location'
		}
		if (!userDeliveryLocation.city || userDeliveryLocation.city.trim().length < 2) {
			errors.city = 'Please update your delivery location'
		}
		if (method === 'JAZZCASH') {
			if (!paymentReference.trim()) {
				errors.paymentReference = 'Please provide your JazzCash reference number'
			}
			if (!paymentProofDataUrl) {
				setProofError('Please upload your JazzCash payment screenshot')
			}
		}
		
		if (Object.keys(errors).length > 0 || (method === 'JAZZCASH' && !paymentProofDataUrl)) {
			setFormErrors(errors)
			if (method === 'JAZZCASH' && !paymentProofDataUrl) {
				showError('Please upload your JazzCash payment screenshot', 'Payment Required')
			} else {
				showError('Please fix the errors in the form', 'Form Validation')
			}
			return
		}
		
		setFormErrors({})
		setLoading(true)
		try {
			const res = await fetch('/api/orders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					paymentMethod: method,
					shippingName: form.name,
					shippingPhone: form.phone,
					shippingAddress: userDeliveryLocation.address,
					city: userDeliveryLocation.city,
					...(method === 'JAZZCASH' ? { paymentReference, paymentProofDataUrl } : {}),
				})
			})
			const json = await res.json()
			if (!res.ok || !json.success) {
				// Check for delivery location errors - be more comprehensive
				const errorMsg = json.message?.toLowerCase() || ''
				const errorType = json.errors?.error || ''
				
				if (errorType === 'OUT_OF_RANGE' || 
					errorType === 'NO_LOCATION' ||
					errorMsg.includes('not available') || 
					errorMsg.includes('out of range') ||
					errorMsg.includes('select a delivery location') ||
					errorMsg.includes('update your delivery location')) {
					showError(json.message || 'Delivery is not available at your location. Please update your delivery location before placing the order.', 'Delivery Not Available')
					setTimeout(() => {
						router.push('/change-location?redirect=/checkout')
					}, 2000)
					setLoading(false)
					return
				}
				// For other errors, show the error message
				showError(json.message || 'Failed to place order', 'Order Failed')
				setLoading(false)
				return
			}
			setOrderId(json.data.orderId)
			clear()
			setStep(2)
			toast.success('Order placed successfully')
		} catch (e: any) {
			showError(e.message || 'Failed to place order', 'Order Error')
		} finally {
			setLoading(false)
		}
	}

	function loadImage(file: File): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image()
			img.onload = () => resolve(img)
			img.onerror = reject
			const reader = new FileReader()
			reader.onload = () => { img.src = String(reader.result) }
			reader.onerror = reject
			reader.readAsDataURL(file)
		})
	}

	async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		setProofError('')
		const file = e.target.files?.[0]
		if (!file) return
		try {
			const img = await loadImage(file)
			const maxW = 800, maxH = 800
			let { width, height } = img
			const ratio = Math.min(maxW / width, maxH / height, 1)
			width = Math.round(width * ratio)
			height = Math.round(height * ratio)
			const canvas = document.createElement('canvas')
			canvas.width = width
			canvas.height = height
			const ctx = canvas.getContext('2d')!
			ctx.drawImage(img, 0, 0, width, height)
			const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
			const bytes = approxBytesFromDataUrl(dataUrl)
			if (bytes > 1.5 * 1024 * 1024) {
				const msg = 'Image too large. Please upload a smaller screenshot (under 1.5MB).'
				setProofError(msg)
				setPaymentProofDataUrl('')
				showError(msg, 'Image Error')
				return
			}
			setPaymentProofDataUrl(dataUrl)
			toast.success('Screenshot added')
		} catch {
			setProofError('Failed to read image. Please try another file.')
			showError('Failed to read image. Please try another file.', 'Image Error')
		}
	}

	// Save guest location after login
	useEffect(() => {
		if (session?.user?.email) {
			// Check if there's a guest location in localStorage
			const savedLocation = localStorage.getItem('deliveryLocation')
			if (savedLocation) {
				try {
					const location = JSON.parse(savedLocation)
					// If it's a guest location (no userEmail), save it to DB
					if (!location.userEmail && location.address && location.latitude && location.longitude) {
						fetch('/api/user-delivery-location', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								address: location.address,
								latitude: location.latitude,
								longitude: location.longitude,
								city: location.city || ''
							})
						}).then(res => res.json()).then(json => {
							if (json.success) {
								// Update localStorage with user email
								if (session?.user?.email) {
									const updatedLocation = { ...location, userEmail: session.user.email }
									localStorage.setItem('deliveryLocation', JSON.stringify(updatedLocation))
								}
								// Update form if empty
								if (!form.address && json.data?.address) {
									setForm(prev => ({
										...prev,
										address: json.data.address,
										city: json.data.city || prev.city
									}))
								}
							}
						}).catch(() => {})
					}
				} catch {}
			}
		}
	}, [session])

	if (!session) {
		return (
			<div className="container-pg py-12">
				<h1 className="text-2xl font-semibold">Checkout</h1>
				<p className="mt-4">Please log in to continue.</p>
				<button 
					className="mt-4 rounded-md bg-brand-accent px-4 py-2 text-white hover:bg-orange-600 transition-colors" 
					onClick={() => router.push('/auth/login?callbackUrl=/checkout')}
				>
					Login
				</button>
			</div>
		)
	}

	return (
		<div className="container-pg py-4 sm:py-6 md:py-8">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
				<h1 className="text-xl sm:text-2xl font-semibold">Checkout</h1>
				<Stepper step={step} />
			</div>

			{step === 0 && (
				<div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2 rounded-md border p-3 sm:p-4 space-y-4">
						{locationLoading ? (
							<div className="skeleton h-48" />
						) : !userDeliveryLocation ? (
							<div className="rounded-md border border-amber-200 bg-amber-50 p-4 sm:p-6 text-center">
								<p className="text-amber-900 font-medium mb-2 text-sm sm:text-base">Please select your delivery location first</p>
								<p className="text-xs sm:text-sm text-amber-700 mb-4">You need to set your delivery address before proceeding with checkout.</p>
								<Link
									href="/change-location?redirect=/checkout"
									className="inline-flex items-center gap-2 rounded-md bg-brand-accent px-4 py-2 text-white hover:bg-orange-600 transition-colors text-sm sm:text-base"
								>
									Select Location
								</Link>
							</div>
						) : (
							<>
								<div>
									<label className="text-sm">Full name</label>
									<input 
										className={`mt-1 w-full rounded-md border px-3 py-2 bg-gray-50 ${formErrors.name ? 'border-red-500' : ''}`} 
										value={form.name} 
										readOnly
										disabled
									/>
									<p className="mt-1 text-xs text-slate-500">From your account</p>
									{formErrors.name && <div className="mt-1 text-xs text-red-600">{formErrors.name}</div>}
								</div>
								<div>
									<label className="text-sm">Email</label>
									<input 
										className="mt-1 w-full rounded-md border px-3 py-2 bg-gray-50" 
										value={userProfile?.email || ''} 
										readOnly
										disabled
									/>
									<p className="mt-1 text-xs text-slate-500">From your account</p>
								</div>
								<div>
									<label className="text-sm">Phone</label>
									<input 
										className={`mt-1 w-full rounded-md border px-3 py-2 ${formErrors.phone ? 'border-red-500' : ''}`} 
										value={form.phone} 
										onChange={(e) => { setForm({ ...form, phone: e.target.value }); setFormErrors({ ...formErrors, phone: undefined }) }} 
										placeholder="Enter your phone number"
									/>
									{formErrors.phone && <div className="mt-1 text-xs text-red-600">{formErrors.phone}</div>}
								</div>
								<div>
									<label className="text-sm">Delivery Address</label>
									<div className="mt-1 rounded-md border bg-gray-50 px-3 py-2 text-sm text-slate-700">
										{userDeliveryLocation.address}
										{userDeliveryLocation.city && `, ${userDeliveryLocation.city}`}
									</div>
									<div className="mt-2 flex items-center gap-2">
										<Link
											href="/change-location?redirect=/checkout"
											className="text-sm text-brand-accent hover:underline"
										>
											Update location
										</Link>
										<span className="text-xs text-slate-500">• Location can be updated from the location page</span>
									</div>
									{formErrors.address && <div className="mt-1 text-xs text-red-600">{formErrors.address}</div>}
								</div>
							</>
						)}
						{userDeliveryLocation && (
							<div>
								<label className="text-sm">Payment method</label>
								<div className="mt-2 flex flex-col sm:flex-row gap-2">
									<button onClick={() => setMethod('COD')} className={`rounded-md border px-3 py-2 text-sm sm:text-base ${method === 'COD' ? 'bg-brand-accent text-white border-brand-accent' : ''}`}>Cash on Delivery</button>
									<button onClick={() => setMethod('JAZZCASH')} className={`rounded-md border px-3 py-2 text-sm sm:text-base ${method === 'JAZZCASH' ? 'bg-brand-accent text-white border-brand-accent' : ''}`}>JazzCash</button>
								</div>
							{method === 'JAZZCASH' && (
								<div className="mt-3 rounded-md border p-3 bg-amber-50 text-sm">
									<div className="font-medium">JazzCash instructions</div>
									<div className="mt-1">Send the total to: {jcInstruction?.account || 'JazzCash 03XX-XXXXXXX'}</div>
									<div className="mt-1">Amount: {formatCurrencyPKR(subtotal)}</div>
									<div className="mt-1">Message: {jcInstruction?.message || 'Upload your payment screenshot and provide reference number.'}</div>
									<div className="mt-3 grid gap-2 sm:grid-cols-2">
										<div>
											<label className="text-sm">Reference number</label>
											<input 
												value={paymentReference} 
												onChange={(e) => { setPaymentReference(e.target.value); setFormErrors({ ...formErrors, paymentReference: undefined }) }} 
												className={`mt-1 w-full rounded-md border px-3 py-2 ${formErrors.paymentReference ? 'border-red-500' : ''}`} 
												placeholder="e.g., TXN123456" 
											/>
											{formErrors.paymentReference && <div className="mt-1 text-xs text-red-600">{formErrors.paymentReference}</div>}
										</div>
										<div>
											<label className="text-sm">Payment screenshot</label>
											<input type="file" accept="image/*" onChange={onFileChange} className="mt-1 w-full rounded-md border px-3 py-2" />
											{proofError && <div className="mt-1 text-xs text-red-600">{proofError}</div>}
										</div>
									</div>
									{paymentProofDataUrl && (
										<div className="mt-2">
											<img src={paymentProofDataUrl} alt="Payment proof" className="h-32 rounded border object-cover" />
										</div>
									)}
								</div>
							)}
							</div>
						)}
					</div>
					<div className="rounded-md border p-3 sm:p-4 h-fit">
						<div className="text-sm font-medium">Order summary</div>
						<div className="mt-3 space-y-1 text-xs sm:text-sm">
							{items.map(i => (
								<div key={i.id} className="flex items-center justify-between gap-2">
									<div className="text-slate-600 truncate flex-1">{i.title} × {i.quantity}</div>
									<div className="font-medium flex-shrink-0">{formatCurrencyPKR(i.unitPrice * i.quantity)}</div>
								</div>
							))}
						</div>
						<div className="mt-3 flex items-center justify-between text-xs sm:text-sm">
							<div className="text-slate-600">Subtotal</div>
							<div className="font-semibold">{formatCurrencyPKR(subtotal)}</div>
						</div>
						<div className="mt-1 flex items-center justify-between text-xs sm:text-sm">
							<div className="text-slate-600">Delivery</div>
							<div className="font-semibold">{formatCurrencyPKR(200)}</div>
						</div>
						<div className="mt-1 flex items-center justify-between border-t pt-2 text-xs sm:text-sm">
							<div className="font-medium">Total</div>
							<div className="font-semibold">{formatCurrencyPKR(subtotal + 200)}</div>
						</div>
						<button disabled={loading} className="mt-4 w-full rounded-md bg-brand-accent px-3 py-2 text-white text-sm sm:text-base" onClick={() => setStep(1)}>
							Continue
						</button>
					</div>
				</div>
			)}

			{step === 1 && (
				<div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2 rounded-md border p-3 sm:p-4">
						<div className="text-sm font-medium">Review</div>
						<div className="mt-3 text-xs sm:text-sm">
							<div><span className="text-slate-600">Name:</span> {form.name}</div>
							<div><span className="text-slate-600">Phone:</span> {form.phone}</div>
							<div><span className="text-slate-600">City:</span> {form.city}</div>
							<div><span className="text-slate-600">Address:</span> {form.address}</div>
							<div className="mt-3"><span className="text-slate-600">Payment:</span> {method}</div>
							{method === 'JAZZCASH' && (
								<div className="mt-2 space-y-1">
									<div><span className="text-slate-600">Reference:</span> {paymentReference || '-'}</div>
									{paymentProofDataUrl && <img src={paymentProofDataUrl} alt="Proof" className="h-32 rounded border object-cover" />}
								</div>
							)}
						</div>
					</div>
					<div className="rounded-md border p-3 sm:p-4 h-fit">
						<div className="flex items-center justify-between text-xs sm:text-sm">
							<div className="text-slate-600">Subtotal</div>
							<div className="font-semibold">{formatCurrencyPKR(subtotal)}</div>
						</div>
						<div className="flex items-center justify-between mt-1 text-xs sm:text-sm">
							<div className="text-slate-600">Delivery</div>
							<div className="font-semibold">{formatCurrencyPKR(200)}</div>
						</div>
						<div className="flex items-center justify-between mt-1 border-t pt-2 text-xs sm:text-sm">
							<div className="font-medium">Total</div>
							<div className="font-semibold">{formatCurrencyPKR(subtotal + 200)}</div>
						</div>
						<button disabled={loading} className="mt-4 w-full rounded-md bg-brand-accent px-3 py-2 text-white text-sm sm:text-base" onClick={placeOrder}>
							{loading ? 'Placing order...' : 'Place order'}
						</button>
						<button className="mt-2 w-full rounded-md border px-3 py-2 text-sm sm:text-base" onClick={() => setStep(0)}>Back</button>
					</div>
				</div>
			)}

			{step === 2 && (
				<div className="mt-6 sm:mt-10 text-center px-4">
					<div className="text-xl sm:text-2xl font-semibold">Thank you! Your order is placed.</div>
					<div className="mt-2 text-slate-600">Order ID: {orderId}</div>
					<div className="mt-4 text-sm text-slate-500">
						Redirecting to products in {redirectCountdown} seconds... 
						<br />
						<Link href="/products" className="text-brand-accent hover:underline mt-2 inline-block">
							Or click here to continue shopping
						</Link>
					</div>
				</div>
			)}
		</div>
	)
}
