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
import { Phone, MapPin, CreditCard, Banknote, Truck, CheckCircle2, Edit2, Trash2 } from 'lucide-react'

export default function CheckoutPage() {
	const { showError } = useErrorDialog()
	const { data: session, status } = useSession()
	const router = useRouter()
	const { items, clear } = useCartStore()
	const [step, setStep] = useState(0)
	const [method, setMethod] = useState<'COD' | 'JAZZCASH' | 'EASYPAISA'>('COD')
	const [selectedAccount, setSelectedAccount] = useState<{ type: 'JAZZCASH' | 'EASYPAISA' | 'BANK'; accountName: string; accountNumber: string; bankName: string; index?: number } | null>(null)
	const [otherBankName, setOtherBankName] = useState('')
	const [otherAccountName, setOtherAccountName] = useState('')
	const [otherAccountNumber, setOtherAccountNumber] = useState('')
	const [deliveryType, setDeliveryType] = useState<'STANDARD' | 'EXPRESS'>('STANDARD')
	const [form, setForm] = useState({ name: '', phone: '', address: '', city: '' })
	const [loading, setLoading] = useState(false)
	const [orderId, setOrderId] = useState<string | null>(null)
	const [jcInstruction, setJcInstruction] = useState<{ id: string; account: string; amount: number; message: string } | null>(null)
	const [jazzcashAccountName, setJazzcashAccountName] = useState('')
	const [jazzcashAccountNumber, setJazzcashAccountNumber] = useState('')
	const [jazzcashBankName, setJazzcashBankName] = useState('')
	const [easypaisaAccountName, setEasypaisaAccountName] = useState('')
	const [easypaisaAccountNumber, setEasypaisaAccountNumber] = useState('')
	const [easypaisaBankName, setEasypaisaBankName] = useState('')
	const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string; city?: string; paymentMethod?: string; jazzcashAccountName?: string; jazzcashAccountNumber?: string; easypaisaAccountName?: string; easypaisaAccountNumber?: string; otherBankName?: string; otherAccountName?: string; otherAccountNumber?: string }>({})
	const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false)
	const [showPaymentDetailsDialog, setShowPaymentDetailsDialog] = useState(false)
	const [selectedPaymentType, setSelectedPaymentType] = useState<'JAZZCASH' | 'EASYPAISA' | 'OTHER' | null>(null)
	const [showSavePrompt, setShowSavePrompt] = useState(false)
	const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null) // For editing other banks
	const [editingJazzCash, setEditingJazzCash] = useState(false)
	const [editingEasyPaisa, setEditingEasyPaisa] = useState(false)
	const [userDeliveryLocation, setUserDeliveryLocation] = useState<{ address: string; city: string; latitude?: number; longitude?: number } | null>(null)
	const [userProfile, setUserProfile] = useState<{ name: string; email: string; phone?: string; paymentMethods?: any } | null>(null)
	const [savingPhone, setSavingPhone] = useState(false)
	const [phoneSaved, setPhoneSaved] = useState(false)
	const [redirectCountdown, setRedirectCountdown] = useState(4)
	const [locationLoading, setLocationLoading] = useState(true)

	const subtotal = cartTotal(items)
	const deliveryFee = deliveryType === 'EXPRESS' ? 500 : 200
	const total = subtotal + deliveryFee

	// Validation function
	function validateForm() {
		const errors: { name?: string; phone?: string; address?: string; city?: string; jazzcashAccountName?: string; jazzcashAccountNumber?: string; easypaisaAccountName?: string; easypaisaAccountNumber?: string; otherBankName?: string; otherAccountName?: string; otherAccountNumber?: string; paymentMethod?: string } = {}
		
		if (!form.name.trim() || form.name.trim().length < 2) {
			errors.name = 'Name must be at least 2 characters'
		}
		if (!form.phone.trim() || form.phone.trim().length < 7) {
			errors.phone = 'Phone must be at least 7 characters'
		}
		if (!userDeliveryLocation?.address || userDeliveryLocation.address.trim().length < 6) {
			errors.address = 'Please update your delivery location'
		}
		if (!userDeliveryLocation?.city || userDeliveryLocation.city.trim().length < 2) {
			errors.city = 'Please update your delivery location'
		}
		
		// Validate payment method details - check if account is selected
		if (method === 'JAZZCASH' || method === 'EASYPAISA') {
			if (!selectedAccount) {
				errors.paymentMethod = 'Please select a payment account'
			} else if (!selectedAccount.accountName.trim()) {
				errors.paymentMethod = 'Please provide your account name'
			} else if (!selectedAccount.accountNumber.trim()) {
				errors.paymentMethod = 'Please provide your account number'
			}
		}
		
		setFormErrors(errors)
		return Object.keys(errors).length === 0
	}

	function handleContinue() {
		if (!userDeliveryLocation) {
			setFormErrors({ address: 'Please select your delivery location first' })
			toast.error('Please select your delivery location first')
			return
		}
		
		if (validateForm()) {
			setStep(1)
		} else {
			// Scroll to first error
			const firstErrorField = document.querySelector('.border-red-500')
			if (firstErrorField) {
				firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
			}
			toast.error('Please fix the errors in the form')
		}
	}

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
							phone: profileJson.data.phone,
							paymentMethods: profileJson.data.paymentMethods
						})
						// Pre-fill name and phone
						setForm(prev => ({
							...prev,
							name: profileJson.data.name || prev.name,
							phone: profileJson.data.phone || prev.phone
						}))
						// Pre-fill payment method details if available
						// Payment methods will be auto-filled when user selects them
						// Check if phone is already saved
						if (profileJson.data.phone) {
							setPhoneSaved(true)
						}
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

	// Load JazzCash instructions only when method is selected and order hasn't been placed yet
	useEffect(() => {
		// Don't fetch instructions if order is already placed
		if (orderId) {
			setJcInstruction(null)
			return
		}
		
		if (method === 'JAZZCASH' && subtotal > 0) {
			;(async () => {
				try {
					const res = await fetch('/api/payments/jazzcash', { 
						method: 'POST', 
						headers: { 'Content-Type': 'application/json' }, 
						body: JSON.stringify({ 
							amount: Math.round(subtotal),
							orderId: 'pending'
						}) 
					})
					const json = await res.json()
					if (json?.success) {
						setJcInstruction(json.data)
					}
					// Silently fail - JazzCash instructions are not critical for order placement
				} catch (error) {
					// Silently fail - JazzCash instructions are not critical
				}
			})()
		} else if (method !== 'JAZZCASH') {
			setJcInstruction(null)
		}
	}, [method, subtotal, orderId])


	async function placeOrder() {
		// Check if location is selected
		if (!userDeliveryLocation) {
			setFormErrors({ address: 'Please select your delivery location first' })
			toast.error('Please select your delivery location first')
			router.push('/change-location?redirect=/checkout')
			return
		}
		
		// Validate form
		if (!validateForm()) {
			// Scroll to first error
			const firstErrorField = document.querySelector('.border-red-500')
			if (firstErrorField) {
				firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
			}
			toast.error('Please fix the errors in the form')
			// Go back to step 0 to show errors
			setStep(0)
			return
		}
		
		// Check if cart has items
		if (!items || items.length === 0) {
			toast.error('Your cart is empty. Please add items to your cart before placing an order.')
			return
		}
		
		// Sync cart to database before placing order
		setLoading(true)
		try {
			// Sync all cart items to database
			for (const item of items) {
				await fetch('/api/cart', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						productId: item.productId,
						variantId: item.variantId,
						quantity: item.quantity
					})
				})
			}
		} catch (error) {
			console.error('Error syncing cart:', error)
			// Continue anyway - the API will check the cart
		}
		
		setFormErrors({})
		try {
				const res = await fetch('/api/orders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						paymentMethod: method,
						deliveryType: deliveryType,
						shippingName: form.name,
						shippingPhone: form.phone,
						shippingAddress: userDeliveryLocation.address,
						city: userDeliveryLocation.city,
						...(selectedAccount ? {
							paymentAccountName: selectedAccount.accountName,
							paymentAccountNumber: selectedAccount.accountNumber,
							paymentBankName: selectedAccount.bankName
						} : {}),
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
			
			// Auto-save payment method details if not already saved
			if (session?.user?.email && selectedAccount && method !== 'COD') {
				try {
					// Get existing payment methods to merge with
					const existingPaymentMethods = userProfile?.paymentMethods || {
						jazzcash: { accountName: '', accountNumber: '', bankName: '' },
						easypaisa: { accountName: '', accountNumber: '', bankName: '' },
						other: []
					}
					
					// Check if payment method is already saved
					let isSaved = false
					if (selectedAccount.type === 'JAZZCASH') {
						isSaved = existingPaymentMethods.jazzcash?.accountNumber === selectedAccount.accountNumber
					} else if (selectedAccount.type === 'EASYPAISA') {
						isSaved = existingPaymentMethods.easypaisa?.accountNumber === selectedAccount.accountNumber
					} else if (selectedAccount.type === 'BANK') {
						isSaved = existingPaymentMethods.other?.some((b: any) => 
							b.bankName === selectedAccount.bankName && b.accountNumber === selectedAccount.accountNumber
						)
					}
					
					// Merge with existing payment methods
					const updatedPaymentMethods = {
						jazzcash: existingPaymentMethods.jazzcash || { accountName: '', accountNumber: '', bankName: '' },
						easypaisa: existingPaymentMethods.easypaisa || { accountName: '', accountNumber: '', bankName: '' },
						other: Array.isArray(existingPaymentMethods.other) ? [...existingPaymentMethods.other] : []
					}
					
					if (!isSaved) {
						if (selectedAccount.type === 'JAZZCASH') {
							updatedPaymentMethods.jazzcash = {
								accountName: selectedAccount.accountName,
								accountNumber: selectedAccount.accountNumber,
								bankName: selectedAccount.bankName || 'JazzCash'
							}
						} else if (selectedAccount.type === 'EASYPAISA') {
							updatedPaymentMethods.easypaisa = {
								accountName: selectedAccount.accountName,
								accountNumber: selectedAccount.accountNumber,
								bankName: selectedAccount.bankName || 'EasyPaisa'
							}
						} else if (selectedAccount.type === 'BANK') {
							updatedPaymentMethods.other.push({
								bankName: selectedAccount.bankName,
								accountName: selectedAccount.accountName,
								accountNumber: selectedAccount.accountNumber
							})
						}
						
						await fetch('/api/account', {
							method: 'PUT',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ paymentMethods: updatedPaymentMethods })
						})
						toast.success('Payment method saved to profile')
					}
				} catch (error) {
					// Silently fail - payment method saving is not critical
					console.error('Failed to save payment method:', error)
				}
			}
			
			clear()
			setStep(2)
			toast.success('Order placed successfully')
		} catch (e: any) {
			showError(e.message || 'Failed to place order', 'Order Error')
		} finally {
			setLoading(false)
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

	// Wait for session to be determined before showing anything
	useEffect(() => {
		if (status === 'unauthenticated') {
			// Redirect to login with callback URL
			router.push('/auth/login?callbackUrl=/checkout')
		}
	}, [status, router])

	// Show loading state while checking authentication
	if (status === 'loading') {
		return (
			<div className="container-pg py-12">
				<div className="flex items-center justify-center">
					<div className="flex flex-col items-center gap-4">
						<div className="relative w-16 h-16">
							<div className="absolute inset-0 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
						</div>
						<p className="text-sm text-gray-600">Loading...</p>
					</div>
				</div>
			</div>
		)
	}

	// Don't render checkout if not authenticated (will redirect)
	if (status === 'unauthenticated' || !session) {
		return null
	}

	return (
		<div className="container-pg py-4 sm:py-6 md:py-8">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
				<h1 className="text-xl sm:text-2xl font-semibold">Checkout</h1>
				<Stepper step={step} />
			</div>

			{step === 0 && (
				<div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2  border p-3 sm:p-4 space-y-4 max-w-2xl">
						{locationLoading ? (
							<div className="skeleton h-48" />
						) : !userDeliveryLocation ? (
							<div className=" border border-amber-200 bg-amber-50 p-4 sm:p-6 text-center">
								<p className="text-amber-900 font-medium mb-2 text-sm sm:text-base">Please select your delivery location first</p>
								<p className="text-xs sm:text-sm text-amber-700 mb-4">You need to set your delivery address before proceeding with checkout.</p>
								<Link
									href="/change-location?redirect=/checkout"
									className="btn-primary inline-flex items-center gap-2"
								>
									Select Location
								</Link>
							</div>
						) : (
							<>
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 block">Full name</label>
									<input 
										className={`input-enhanced bg-gray-50 max-w-sm ${formErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`} 
										value={form.name} 
										readOnly
										disabled
									/>
									<p className="mt-1 text-xs text-slate-500">From your account</p>
									{formErrors.name && <div className="mt-1 text-xs text-red-600">{formErrors.name}</div>}
								</div>
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
									<input 
										className="input-enhanced bg-gray-50 max-w-sm" 
										value={userProfile?.email || ''} 
										readOnly
										disabled
									/>
									<p className="mt-1 text-xs text-slate-500">From your account</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
										<Phone className="h-4 w-4 text-gray-600" />
										Phone
									</label>
									{userProfile?.phone ? (
										<div className="max-w-sm">
											<input 
												type="tel"
												className="input-enhanced bg-gray-50" 
												value={userProfile.phone} 
												readOnly
												disabled
											/>
											<p className="mt-1 text-xs text-slate-500">From your profile</p>
											<button
												type="button"
												onClick={() => {
													setForm({ ...form, phone: '' })
													setPhoneSaved(false)
												}}
												className="mt-1 text-xs text-brand-accent hover:underline"
											>
												Edit phone number
											</button>
										</div>
									) : (
										<div className="relative max-w-sm">
											<input 
												type="tel"
												className={`input-enhanced pr-10 ${formErrors.phone ? 'border-red-500 focus:ring-red-500' : ''}`} 
												value={form.phone} 
												onChange={(e) => { 
													const value = e.target.value
													// Only allow numbers
													const cleanedValue = value.replace(/[^0-9]/g, '')
													setForm({ ...form, phone: cleanedValue }); 
													setFormErrors({ ...formErrors, phone: undefined });
													setPhoneSaved(false);
												}} 
												placeholder="Enter your phone number"
											/>
										{form.phone.trim().length >= 7 && !phoneSaved && (
											<button
												type="button"
												onClick={async () => {
													if (savingPhone) return
													setSavingPhone(true)
													try {
														const res = await fetch('/api/account', {
															method: 'PUT',
															headers: { 'Content-Type': 'application/json' },
															body: JSON.stringify({ phone: form.phone.trim() })
														})
														const json = await res.json()
														if (res.ok && json.success) {
															setPhoneSaved(true)
															setUserProfile(prev => prev ? { ...prev, phone: form.phone.trim() } : null)
															toast.success('Phone number saved')
														} else {
															toast.error(json.message || 'Failed to save phone number')
														}
													} catch (error) {
														toast.error('Failed to save phone number')
													} finally {
														setSavingPhone(false)
													}
												}}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 hover:text-green-700 transition-colors"
												title="Save for next time"
											>
												{savingPhone ? (
													<div className="h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
												) : (
													<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
													</svg>
												)}
											</button>
										)}
										{phoneSaved && (
											<button
												type="button"
												onClick={() => {
													setPhoneSaved(false)
													setForm({ ...form, phone: '' })
												}}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 transition-colors"
												title="Edit phone number"
											>
												<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
											</button>
										)}
											{form.phone.trim().length >= 7 && !phoneSaved && (
												<div className="mt-1 text-xs text-gray-500">Click the checkmark to save for next time</div>
											)}
											{formErrors.phone && <div className="mt-1 text-xs text-red-600">{formErrors.phone}</div>}
										</div>
									)}
								</div>
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
										<MapPin className="h-4 w-4 text-gray-600" />
										Delivery Address
									</label>
									<div className=" border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-700 max-w-2xl">
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
								<label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
									<CreditCard className="h-4 w-4 text-gray-600" />
									Payment method
								</label>
								<div className="flex flex-wrap gap-2">
									<button 
										onClick={() => setMethod('COD')} 
										className={`p-2  border-2 transition-all ${method === 'COD' ? 'border-brand-accent bg-brand-accent/10' : 'border-gray-300 hover:border-gray-400'}`}
									>
										<img 
											src="/cod.png" 
											alt="Cash on Delivery" 
											className="h-8 w-auto object-contain"
											onError={(e) => {
												const target = e.target as HTMLImageElement
												target.style.display = 'none'
												const parent = target.parentElement
												if (parent) {
													parent.innerHTML = '<span class="text-sm">Cash on Delivery</span>'
												}
											}}
										/>
									</button>
									<button 
										onClick={() => {
											setMethod('JAZZCASH')
											setShowPaymentMethodDialog(true)
										}} 
										className={`p-2  border-2 transition-all ${method === 'JAZZCASH' ? 'border-brand-accent bg-brand-accent/10' : 'border-gray-300 hover:border-gray-400'}`}
									>
										<img 
											src="/jazzcash.png" 
											alt="JazzCash" 
											className="h-8 w-auto object-contain"
											onError={(e) => {
												const target = e.target as HTMLImageElement
												target.style.display = 'none'
												const parent = target.parentElement
												if (parent) {
													parent.innerHTML = '<span class="text-sm">JazzCash</span>'
												}
											}}
										/>
									</button>
									<button 
										onClick={() => {
											setMethod('EASYPAISA')
											setShowPaymentMethodDialog(true)
										}} 
										className={`p-2  border-2 transition-all ${method === 'EASYPAISA' ? 'border-brand-accent bg-brand-accent/10' : 'border-gray-300 hover:border-gray-400'}`}
									>
										<img 
											src="/easypaisa.png" 
											alt="EasyPaisa" 
											className="h-8 w-auto object-contain"
											onError={(e) => {
												const target = e.target as HTMLImageElement
												target.style.display = 'none'
												const parent = target.parentElement
												if (parent) {
													parent.innerHTML = '<span class="text-sm">EasyPaisa</span>'
												}
											}}
										/>
									</button>
								</div>
							{/* Selected Payment Method Display */}
							{method !== 'COD' && (
								<div className="mt-3  border p-3 text-sm">
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-2">
											{method === 'JAZZCASH' && (
												<>
													<img src="/jazzcash.png" alt="JazzCash" className="h-6 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
													<span className="font-medium">JazzCash</span>
												</>
											)}
											{method === 'EASYPAISA' && (
												<>
													<img src="/easypaisa.png" alt="EasyPaisa" className="h-6 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
													<span className="font-medium">EasyPaisa</span>
												</>
											)}
										</div>
										<button
											type="button"
										onClick={() => {
											setMethod('COD')
											// Clear selected account when switching to COD
											setSelectedAccount(null)
										}}
											className="text-xs text-red-600 hover:underline"
										>
											Remove
										</button>
									</div>
									
									{/* Payment Instructions */}
									<div className="mt-2 space-y-2">
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4 text-gray-600" />
											<span className="font-medium">Send payment to:</span>
										</div>
										<div className="text-2xl font-bold text-brand-accent">03004056650</div>
										<div className="mt-2 space-y-1">
											<div className="flex items-center justify-between">
												<span className="font-medium flex items-center gap-2">
													<Banknote className="h-4 w-4 text-gray-600" />
													Product Amount:
												</span>
												<span className="font-semibold">{formatCurrencyPKR(subtotal)}</span>
											</div>
											<div className="flex items-center justify-between">
												<span className="font-medium flex items-center gap-2">
													<Truck className="h-4 w-4 text-gray-600" />
													Delivery Charges:
												</span>
												<span className="font-semibold">{formatCurrencyPKR(deliveryFee)}</span>
											</div>
											<div className="flex items-center justify-between pt-2 border-t border-gray-200">
												<span className="font-bold">Total Amount:</span>
												<span className="font-bold text-lg text-brand-accent">{formatCurrencyPKR(total)}</span>
											</div>
										</div>
									</div>
									
									{/* Account Details Display - User's account (sending from) */}
									{selectedAccount && (
										<div className="mt-4 space-y-2 p-3 bg-gray-50 ">
											<div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
												<CreditCard className="h-4 w-4 text-gray-600" />
												Your account details <span className="text-xs text-gray-500 font-normal">(sending payment through {selectedAccount.bankName})</span>
											</div>
											<div>
												<span className="text-sm font-medium text-gray-700">Bank Name: </span>
												<span className="text-sm text-gray-900">{selectedAccount.bankName}</span>
											</div>
											<div>
												<span className="text-sm font-medium text-gray-700">Account Name: </span>
												<span className="text-sm text-gray-900">{selectedAccount.accountName}</span>
											</div>
											<div>
												<span className="text-sm font-medium text-gray-700">Account Number: </span>
												<span className="text-sm text-gray-900">{selectedAccount.accountNumber}</span>
											</div>
											<button 
												onClick={() => {
													setShowPaymentMethodDialog(true)
												}}
												className="text-xs text-brand-accent hover:underline mt-2"
											>
												Change payment method
											</button>
										</div>
									)}
									
									{/* Show button if no account selected */}
									{!selectedAccount && (
										<button 
											onClick={() => {
												setShowPaymentMethodDialog(true)
											}}
											className="mt-4 w-full btn-primary text-sm py-2"
										>
											Select Payment Account
										</button>
									)}
									
									{/* Payment Method Validation Errors */}
									{formErrors.paymentMethod && (
										<div className="mt-3 p-3 bg-red-50 border border-red-200 ">
											<div className="text-sm font-medium text-red-800 mb-1">Please complete payment details:</div>
											<div className="text-xs text-red-600">• {formErrors.paymentMethod}</div>
										</div>
									)}
								</div>
							)}
							
						</div>
					)}
					</div>
					<div className=" border p-3 sm:p-4 h-fit">
						<div className="text-sm font-medium">Order summary</div>
						<div className="mt-3 space-y-1 text-xs sm:text-sm">
							{items.map(i => (
								<div key={i.id} className="flex items-center justify-between gap-2">
									<div className="text-slate-600 truncate flex-1">{i.title} × {i.quantity}</div>
									<div className="font-medium flex-shrink-0">{formatCurrencyPKR(i.unitPrice * i.quantity)}</div>
								</div>
							))}
						</div>
						
						{/* Delivery Type Selection */}
						{userDeliveryLocation && (
							<div className="mt-4 pt-4 border-t">
								<label className="text-sm font-medium text-gray-700 mb-2 block">Delivery Type</label>
								<div className="space-y-2">
									<label className="flex items-start gap-2 cursor-pointer">
										<input
											type="radio"
											name="deliveryType"
											value="STANDARD"
											checked={deliveryType === 'STANDARD'}
											onChange={() => setDeliveryType('STANDARD')}
											className="mt-0.5 h-4 w-4 text-brand-accent focus:ring-brand-accent"
										/>
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<img 
													src="/standard-delivery.png" 
													alt="Standard Delivery" 
													className="h-5 w-auto object-contain"
													onError={(e) => {
														const target = e.target as HTMLImageElement
														target.style.display = 'none'
													}}
												/>
												<span className="text-sm font-medium">Standard Delivery</span>
											</div>
											<div className="text-xs text-gray-600 ml-7">Rs. 200 • 3-5 days</div>
										</div>
									</label>
									<label className="flex items-start gap-2 cursor-pointer">
										<input
											type="radio"
											name="deliveryType"
											value="EXPRESS"
											checked={deliveryType === 'EXPRESS'}
											onChange={() => setDeliveryType('EXPRESS')}
											className="mt-0.5 h-4 w-4 text-brand-accent focus:ring-brand-accent"
										/>
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<img 
													src="/express-delivery.png" 
													alt="Express Delivery" 
													className="h-5 w-auto object-contain"
													onError={(e) => {
														const target = e.target as HTMLImageElement
														target.style.display = 'none'
													}}
												/>
												<span className="text-sm font-medium">Express Delivery</span>
											</div>
											<div className="text-xs text-gray-600 ml-7">Rs. 500 • 1-2 days</div>
										</div>
									</label>
								</div>
							</div>
						)}
						
						<div className="mt-3 flex items-center justify-between text-xs sm:text-sm">
							<div className="text-slate-600">Subtotal</div>
							<div className="font-semibold">{formatCurrencyPKR(subtotal)}</div>
						</div>
						<div className="mt-1 flex items-center justify-between text-xs sm:text-sm">
							<div className="text-slate-600">Delivery</div>
							<div className="font-semibold">{formatCurrencyPKR(deliveryFee)}</div>
						</div>
						<div className="mt-1 flex items-center justify-between border-t pt-2 text-xs sm:text-sm">
							<div className="font-medium">Total</div>
							<div className="font-semibold">{formatCurrencyPKR(total)}</div>
						</div>
						<button disabled={loading} className="btn-large mt-4 w-full" onClick={handleContinue}>
							Continue
						</button>
					</div>
				</div>
			)}

			{step === 1 && (
				<div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2  border p-4 sm:p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">Review Your Order</h2>
						
						{/* Shipping Information */}
						<div className="mb-6 pb-6 border-b">
							<h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
								<span className="h-1.5 w-1.5 rounded-full bg-brand-accent"></span>
								Shipping Information
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
								<div>
									<span className="text-slate-600 block mb-1">Name</span>
									<span className="font-medium text-gray-900">{form.name}</span>
								</div>
								<div>
									<span className="text-slate-600 block mb-1">Phone</span>
									<span className="font-medium text-gray-900">{form.phone}</span>
								</div>
								<div>
									<span className="text-slate-600 block mb-1">City</span>
									<span className="font-medium text-gray-900">{userDeliveryLocation?.city || form.city}</span>
								</div>
								<div className="sm:col-span-2">
									<span className="text-slate-600 block mb-1">Address</span>
									<span className="font-medium text-gray-900">{userDeliveryLocation?.address || form.address}</span>
								</div>
							</div>
						</div>

						{/* Delivery Type */}
						<div className="mb-6 pb-6 border-b">
							<h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
								<span className="h-1.5 w-1.5 rounded-full bg-brand-accent"></span>
								Delivery Type
							</h3>
							<div className="flex items-center gap-3">
								<img 
									src={deliveryType === 'STANDARD' ? "/standard-delivery.png" : "/express-delivery.png"} 
									alt={deliveryType === 'STANDARD' ? "Standard Delivery" : "Express Delivery"} 
									className="h-8 w-auto object-contain"
									onError={(e) => {
										const target = e.target as HTMLImageElement
										target.style.display = 'none'
									}}
								/>
								<div>
									<div className="text-sm font-medium text-gray-900">
										{deliveryType === 'STANDARD' ? 'Standard Delivery' : 'Express Delivery'}
									</div>
									<div className="text-xs text-gray-600">
										{deliveryType === 'STANDARD' ? '3-5 days' : '1-2 days'}
									</div>
								</div>
							</div>
						</div>

						{/* Payment Information */}
						<div>
							<h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
								<span className="h-1.5 w-1.5 rounded-full bg-brand-accent"></span>
								Payment Information
							</h3>
							<div className="flex items-center gap-3 mb-3">
								{method === 'COD' ? (
									<img 
										src="/cod.png" 
										alt="Cash on Delivery" 
										className="h-6 w-auto object-contain"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none'
										}}
									/>
								) : method === 'JAZZCASH' ? (
									<img 
										src="/jazzcash.png" 
										alt="JazzCash" 
										className="h-6 w-auto object-contain"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none'
										}}
									/>
								) : method === 'EASYPAISA' ? (
									<img 
										src="/easypaisa.png" 
										alt="EasyPaisa" 
										className="h-6 w-auto object-contain"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none'
										}}
									/>
								) : (
									<img 
										src="/bank.png" 
										alt={otherBankName || 'Other Bank'} 
										className="h-6 w-auto object-contain"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none'
										}}
									/>
								)}
								<span className="text-sm font-medium text-gray-900">
									{method === 'COD' ? 'Cash on Delivery' : method === 'JAZZCASH' ? 'JazzCash' : method === 'EASYPAISA' ? 'EasyPaisa' : otherBankName || 'Other Bank'}
								</span>
							</div>
							{method !== 'COD' && selectedAccount && (
								<div className="ml-9 space-y-1 text-sm">
									<div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
										<CreditCard className="h-3 w-3" />
										Your account details <span className="text-gray-400">(sending payment through {selectedAccount.bankName || (selectedAccount.type === 'JAZZCASH' ? 'JazzCash' : selectedAccount.type === 'EASYPAISA' ? 'EasyPaisa' : selectedAccount.bankName)})</span>
									</div>
									<div><span className="text-slate-600">Bank Name:</span> <span className="font-medium text-gray-900">{selectedAccount.bankName || (selectedAccount.type === 'JAZZCASH' ? 'JazzCash' : selectedAccount.type === 'EASYPAISA' ? 'EasyPaisa' : '-')}</span></div>
									<div><span className="text-slate-600">Account Name:</span> <span className="font-medium text-gray-900">{selectedAccount.accountName || '-'}</span></div>
									<div><span className="text-slate-600">Account Number:</span> <span className="font-medium text-gray-900">{selectedAccount.accountNumber || '-'}</span></div>
								</div>
							)}
						</div>
					</div>
					<div className=" border p-3 sm:p-4 h-fit">
						<div className="text-sm font-medium mb-3">Order Summary</div>
						<div className="flex items-center justify-between text-xs sm:text-sm mb-2">
							<div className="text-slate-600">Subtotal</div>
							<div className="font-semibold">{formatCurrencyPKR(subtotal)}</div>
						</div>
						<div className="flex items-center justify-between text-xs sm:text-sm mb-2">
							<div className="text-slate-600">Delivery</div>
							<div className="font-semibold">{formatCurrencyPKR(deliveryFee)}</div>
						</div>
						<div className="flex items-center justify-between mt-3 pt-3 border-t text-sm sm:text-base">
							<div className="font-semibold">Total</div>
							<div className="font-bold text-lg text-brand-accent">{formatCurrencyPKR(total)}</div>
						</div>
						<button disabled={loading} className="mt-4 w-full  bg-brand-accent px-3 py-2 text-white text-sm sm:text-base" onClick={placeOrder}>
							{loading ? 'Placing order...' : 'Place order'}
						</button>
						<button className="btn-secondary mt-2 w-full" onClick={() => setStep(0)}>Back</button>
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

			{/* Payment Method Selection Dialog */}
			{showPaymentMethodDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPaymentMethodDialog(false)}>
					<div 
						className="bg-white  shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-4 sm:p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold">Select Payment Method</h3>
								<button 
									onClick={() => {
										setShowPaymentMethodDialog(false)
										setSelectedPaymentType(null)
									}}
									className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
								>
									×
								</button>
							</div>
							
							{/* Show all saved payment accounts - user can select any to send money FROM */}
							{(userProfile?.paymentMethods?.jazzcash?.accountNumber || 
							  userProfile?.paymentMethods?.easypaisa?.accountNumber || 
							  (userProfile?.paymentMethods?.other && userProfile.paymentMethods.other.length > 0)) ? (
								<div className="mb-4">
									<h4 className="text-sm font-medium text-gray-700 mb-2">Select Your Payment Account</h4>
									<p className="text-xs text-gray-500 mb-3">Choose which account you'll use to send payment to {method === 'JAZZCASH' ? 'JazzCash' : 'EasyPaisa'}</p>
									<div className="space-y-2">
										{/* JazzCash - User's saved JazzCash account */}
										{userProfile?.paymentMethods?.jazzcash?.accountNumber && (
											<div className="w-full p-3 border-2 border-gray-300  hover:border-brand-accent hover:bg-brand-accent/5 transition-all flex items-center gap-3">
												<button
													onClick={() => {
														const account = {
															type: 'JAZZCASH' as const,
															accountName: userProfile.paymentMethods.jazzcash.accountName,
															accountNumber: userProfile.paymentMethods.jazzcash.accountNumber,
															bankName: userProfile.paymentMethods.jazzcash.bankName || 'JazzCash'
														}
														setSelectedAccount(account)
														// Also update individual state variables for display
														setJazzcashAccountName(account.accountName)
														setJazzcashAccountNumber(account.accountNumber)
														setJazzcashBankName(account.bankName)
														setShowPaymentMethodDialog(false)
													}}
													className="flex-1 flex items-center gap-3 text-left"
												>
													<img src="/jazzcash.png" alt="JazzCash" className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
													<div className="flex-1">
														<div className="font-medium">JazzCash</div>
														<div className="text-xs text-gray-600">{userProfile.paymentMethods.jazzcash.accountName} • {userProfile.paymentMethods.jazzcash.accountNumber}</div>
													</div>
												</button>
												<div className="flex items-center gap-1">
													<button
														onClick={(e) => {
															e.stopPropagation()
															setSelectedPaymentType('JAZZCASH')
															setEditingJazzCash(true)
															setJazzcashAccountName(userProfile.paymentMethods.jazzcash.accountName)
															setJazzcashAccountNumber(userProfile.paymentMethods.jazzcash.accountNumber)
															setJazzcashBankName(userProfile.paymentMethods.jazzcash.bankName || 'JazzCash')
															setShowPaymentMethodDialog(false)
															setShowPaymentDetailsDialog(true)
														}}
														className="p-2 text-gray-600 hover:text-brand-accent hover:bg-orange-50  transition-colors"
														title="Edit"
													>
														<Edit2 className="h-4 w-4" />
													</button>
													<button
														onClick={async (e) => {
															e.stopPropagation()
															if (!confirm('Are you sure you want to delete this JazzCash account?')) return
															
															try {
																const existingPaymentMethods = userProfile?.paymentMethods || {
																	jazzcash: { accountName: '', accountNumber: '', bankName: '' },
																	easypaisa: { accountName: '', accountNumber: '', bankName: '' },
																	other: []
																}
																
																const updatedPaymentMethods = {
																	...existingPaymentMethods,
																	jazzcash: { accountName: '', accountNumber: '', bankName: '' }
																}
																
																const res = await fetch('/api/account', {
																	method: 'PUT',
																	headers: { 'Content-Type': 'application/json' },
																	body: JSON.stringify({ paymentMethods: updatedPaymentMethods })
																})
																
																if (res.ok) {
																	// Clear selected account if it was the deleted one
																	if (selectedAccount?.type === 'JAZZCASH') {
																		setSelectedAccount(null)
																	}
																	
																	// Reload user profile
																	const profileRes = await fetch('/api/account', { cache: 'no-store' })
																	const profileJson = await profileRes.json()
																	if (profileJson?.data) {
																		setUserProfile(profileJson.data)
																	}
																	
																	toast.success('JazzCash account deleted')
																} else {
																	toast.error('Failed to delete account')
																}
															} catch (error) {
																console.error('Failed to delete JazzCash account:', error)
																toast.error('Failed to delete account')
															}
														}}
														className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50  transition-colors"
														title="Delete"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</div>
										)}
										
										{/* EasyPaisa - User's saved EasyPaisa account */}
										{userProfile?.paymentMethods?.easypaisa?.accountNumber && (
											<div className="w-full p-3 border-2 border-gray-300  hover:border-brand-accent hover:bg-brand-accent/5 transition-all flex items-center gap-3">
												<button
													onClick={() => {
														const account = {
															type: 'EASYPAISA' as const,
															accountName: userProfile.paymentMethods.easypaisa.accountName,
															accountNumber: userProfile.paymentMethods.easypaisa.accountNumber,
															bankName: userProfile.paymentMethods.easypaisa.bankName || 'EasyPaisa'
														}
														setSelectedAccount(account)
														// Also update individual state variables for display
														setEasypaisaAccountName(account.accountName)
														setEasypaisaAccountNumber(account.accountNumber)
														setEasypaisaBankName(account.bankName)
														setShowPaymentMethodDialog(false)
													}}
													className="flex-1 flex items-center gap-3 text-left"
												>
													<img src="/easypaisa.png" alt="EasyPaisa" className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
													<div className="flex-1">
														<div className="font-medium">EasyPaisa</div>
														<div className="text-xs text-gray-600">{userProfile.paymentMethods.easypaisa.accountName} • {userProfile.paymentMethods.easypaisa.accountNumber}</div>
													</div>
												</button>
												<div className="flex items-center gap-1">
													<button
														onClick={(e) => {
															e.stopPropagation()
															setSelectedPaymentType('EASYPAISA')
															setEditingEasyPaisa(true)
															setEasypaisaAccountName(userProfile.paymentMethods.easypaisa.accountName)
															setEasypaisaAccountNumber(userProfile.paymentMethods.easypaisa.accountNumber)
															setEasypaisaBankName(userProfile.paymentMethods.easypaisa.bankName || 'EasyPaisa')
															setShowPaymentMethodDialog(false)
															setShowPaymentDetailsDialog(true)
														}}
														className="p-2 text-gray-600 hover:text-brand-accent hover:bg-orange-50  transition-colors"
														title="Edit"
													>
														<Edit2 className="h-4 w-4" />
													</button>
													<button
														onClick={async (e) => {
															e.stopPropagation()
															if (!confirm('Are you sure you want to delete this EasyPaisa account?')) return
															
															try {
																const existingPaymentMethods = userProfile?.paymentMethods || {
																	jazzcash: { accountName: '', accountNumber: '', bankName: '' },
																	easypaisa: { accountName: '', accountNumber: '', bankName: '' },
																	other: []
																}
																
																const updatedPaymentMethods = {
																	...existingPaymentMethods,
																	easypaisa: { accountName: '', accountNumber: '', bankName: '' }
																}
																
																const res = await fetch('/api/account', {
																	method: 'PUT',
																	headers: { 'Content-Type': 'application/json' },
																	body: JSON.stringify({ paymentMethods: updatedPaymentMethods })
																})
																
																if (res.ok) {
																	// Clear selected account if it was the deleted one
																	if (selectedAccount?.type === 'EASYPAISA') {
																		setSelectedAccount(null)
																	}
																	
																	// Reload user profile
																	const profileRes = await fetch('/api/account', { cache: 'no-store' })
																	const profileJson = await profileRes.json()
																	if (profileJson?.data) {
																		setUserProfile(profileJson.data)
																	}
																	
																	toast.success('EasyPaisa account deleted')
																} else {
																	toast.error('Failed to delete account')
																}
															} catch (error) {
																console.error('Failed to delete EasyPaisa account:', error)
																toast.error('Failed to delete account')
															}
														}}
														className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50  transition-colors"
														title="Delete"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</div>
										)}
										
										{/* Other Banks - User's saved other bank accounts */}
										{userProfile?.paymentMethods?.other && userProfile.paymentMethods.other.length > 0 && userProfile.paymentMethods.other.map((bank: any, index: number) => (
											<div key={index} className="w-full p-3 border-2 border-gray-300  hover:border-brand-accent hover:bg-brand-accent/5 transition-all flex items-center gap-3">
												<button
													onClick={() => {
														const account = {
															type: 'BANK' as const,
															accountName: bank.accountName,
															accountNumber: bank.accountNumber,
															bankName: bank.bankName,
															index
														}
														setSelectedAccount(account)
														// Also update individual state variables for display
														setOtherBankName(account.bankName)
														setOtherAccountName(account.accountName)
														setOtherAccountNumber(account.accountNumber)
														setShowPaymentMethodDialog(false)
													}}
													className="flex-1 flex items-center gap-3 text-left"
												>
													<img 
														src="/bank.png" 
														alt={bank.bankName} 
														className="h-8 w-auto object-contain" 
														onError={(e) => {
															const target = e.target as HTMLImageElement
															target.style.display = 'none'
															const parent = target.parentElement
															if (parent) {
																const svg = parent.querySelector('svg')
																if (svg) svg.style.display = 'block'
															}
														}} 
													/>
													<svg className="h-8 w-8 text-gray-600 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
													</svg>
													<div className="flex-1">
														<div className="font-medium">{bank.bankName}</div>
														<div className="text-xs text-gray-600">{bank.accountName} • {bank.accountNumber}</div>
													</div>
												</button>
												<div className="flex items-center gap-1">
													<button
														onClick={(e) => {
															e.stopPropagation()
															setSelectedPaymentType('OTHER')
															setEditingPaymentIndex(index)
															setOtherBankName(bank.bankName)
															setOtherAccountName(bank.accountName)
															setOtherAccountNumber(bank.accountNumber)
															setShowPaymentMethodDialog(false)
															setShowPaymentDetailsDialog(true)
														}}
														className="p-2 text-gray-600 hover:text-brand-accent hover:bg-orange-50  transition-colors"
														title="Edit"
													>
														<Edit2 className="h-4 w-4" />
													</button>
													<button
														onClick={async (e) => {
															e.stopPropagation()
															if (!confirm(`Are you sure you want to delete this ${bank.bankName} account?`)) return
															
															try {
																const existingPaymentMethods = userProfile?.paymentMethods || {
																	jazzcash: { accountName: '', accountNumber: '', bankName: '' },
																	easypaisa: { accountName: '', accountNumber: '', bankName: '' },
																	other: []
																}
																
																// Remove the bank at the specified index
																const updatedOther = Array.isArray(existingPaymentMethods.other) 
																	? existingPaymentMethods.other.filter((_: any, i: number) => i !== index)
																	: []
																
																const updatedPaymentMethods = {
																	...existingPaymentMethods,
																	other: updatedOther
																}
																
																const res = await fetch('/api/account', {
																	method: 'PUT',
																	headers: { 'Content-Type': 'application/json' },
																	body: JSON.stringify({ paymentMethods: updatedPaymentMethods })
																})
																
																if (res.ok) {
																	// Clear selected account if it was the deleted one
																	if (selectedAccount?.type === 'BANK' && selectedAccount.index === index) {
																		setSelectedAccount(null)
																	}
																	
																	// Reload user profile
																	const profileRes = await fetch('/api/account', { cache: 'no-store' })
																	const profileJson = await profileRes.json()
																	if (profileJson?.data) {
																		setUserProfile(profileJson.data)
																	}
																	
																	toast.success('Bank account deleted')
																} else {
																	toast.error('Failed to delete account')
																}
															} catch (error) {
																console.error('Failed to delete bank account:', error)
																toast.error('Failed to delete account')
															}
														}}
														className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50  transition-colors"
														title="Delete"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</div>
										))}
									</div>
								</div>
							) : null}
							
							{/* Add New Payment Method Options - Only show if not all 3 types are saved */}
							{(() => {
								const hasJazzCash = !!userProfile?.paymentMethods?.jazzcash?.accountNumber
								const hasEasyPaisa = !!userProfile?.paymentMethods?.easypaisa?.accountNumber
								const hasBank = !!(userProfile?.paymentMethods?.other && userProfile.paymentMethods.other.length > 0)
								const hasAllThree = hasJazzCash && hasEasyPaisa && hasBank
								
								// Don't show if all 3 types are already saved
								if (hasAllThree) return null
								
								return (
									<div className={`${(hasJazzCash || hasEasyPaisa || hasBank) ? 'mt-4 pt-4 border-t border-gray-200' : ''}`}>
										<h4 className="text-sm font-medium text-gray-700 mb-3">
											{(hasJazzCash || hasEasyPaisa || hasBank) 
												? 'Add New Payment Method' 
												: 'Select Payment Method'}
										</h4>
										<div className="space-y-2">
											{!hasJazzCash && (
												<button
													onClick={() => {
														setSelectedPaymentType('JAZZCASH')
														setShowPaymentMethodDialog(false)
														setShowPaymentDetailsDialog(true)
													}}
													className="w-full p-3 border-2 border-gray-300  hover:border-brand-accent hover:bg-brand-accent/5 transition-all flex items-center gap-3 text-left"
												>
													<img src="/jazzcash.png" alt="JazzCash" className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
													<div className="flex-1">
														<div className="font-medium">Add JazzCash Account</div>
														<div className="text-xs text-gray-600">Enter your JazzCash account details</div>
													</div>
												</button>
											)}
											
											{!hasEasyPaisa && (
												<button
													onClick={() => {
														setSelectedPaymentType('EASYPAISA')
														setShowPaymentMethodDialog(false)
														setShowPaymentDetailsDialog(true)
													}}
													className="w-full p-3 border-2 border-gray-300  hover:border-brand-accent hover:bg-brand-accent/5 transition-all flex items-center gap-3 text-left"
												>
													<img src="/easypaisa.png" alt="EasyPaisa" className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
													<div className="flex-1">
														<div className="font-medium">Add EasyPaisa Account</div>
														<div className="text-xs text-gray-600">Enter your EasyPaisa account details</div>
													</div>
												</button>
											)}
											
											{!hasBank && (
												<button
													onClick={() => {
														setSelectedPaymentType('OTHER')
														setShowPaymentMethodDialog(false)
														setShowPaymentDetailsDialog(true)
													}}
													className="w-full p-3 border-2 border-gray-300  hover:border-brand-accent hover:bg-brand-accent/5 transition-all flex items-center gap-3 text-left"
												>
													<img src="/bank.png" alt="Other Bank" className="h-8 w-auto object-contain" onError={(e) => {
														const target = e.target as HTMLImageElement
														target.style.display = 'none'
														const parent = target.parentElement
														if (parent) {
															const svg = parent.querySelector('svg')
															if (svg) svg.style.display = 'block'
														}
													}} />
													<svg className="h-8 w-8 text-gray-600 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
													</svg>
													<div className="flex-1">
														<div className="font-medium">Add Other Bank Account</div>
														<div className="text-xs text-gray-600">Enter your bank account details (HBL, UBL, etc.)</div>
													</div>
												</button>
											)}
										</div>
									</div>
								)
							})()}
						</div>
					</div>
				</div>
			)}

			{/* Payment Details Dialog */}
			{showPaymentDetailsDialog && selectedPaymentType && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPaymentDetailsDialog(false)}>
					<div 
						className="bg-white  shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-4 sm:p-6">
							{/* Header */}
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									{selectedPaymentType === 'JAZZCASH' && (
										<>
											<img src="/jazzcash.png" alt="JazzCash" className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
											<div className="font-medium text-lg">{editingJazzCash ? 'Edit JazzCash' : 'JazzCash'}</div>
										</>
									)}
									{selectedPaymentType === 'EASYPAISA' && (
										<>
											<img src="/easypaisa.png" alt="EasyPaisa" className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
											<div className="font-medium text-lg">{editingEasyPaisa ? 'Edit EasyPaisa' : 'EasyPaisa'}</div>
										</>
									)}
									{selectedPaymentType === 'OTHER' && (
										<div className="font-medium text-lg">{editingPaymentIndex !== null ? 'Edit Other Bank' : 'Other Bank'}</div>
									)}
								</div>
								<button 
									onClick={() => {
										setShowPaymentDetailsDialog(false)
										setSelectedPaymentType(null)
										setEditingJazzCash(false)
										setEditingEasyPaisa(false)
										setEditingPaymentIndex(null)
									}}
									className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
								>
									×
								</button>
							</div>

							{/* Payment Instructions */}
							<div className="mt-4 space-y-3">
								<div>
									<span className="font-medium text-sm text-gray-700">Send payment to:</span>
									<div className="text-2xl font-bold text-brand-accent mt-1">03004056650</div>
								</div>
								<div>
									<span className="font-medium text-sm text-gray-700">Amount: </span>
									<span className="font-semibold">{formatCurrencyPKR(subtotal)}</span>
								</div>
							</div>

							{/* Account Details Form */}
							<div className="mt-6 space-y-4">
								{selectedPaymentType === 'OTHER' && (
									<div>
										<label className="text-sm font-medium text-gray-700 mb-1.5 block">Bank Name *</label>
										<input 
											value={otherBankName} 
											onChange={(e) => {
												setOtherBankName(e.target.value)
												setFormErrors({ ...formErrors, otherBankName: undefined })
											}} 
											className={`input-enhanced w-full ${formErrors.otherBankName ? 'border-red-500 focus:ring-red-500' : ''}`} 
											placeholder="e.g., HBL, UBL, Meezan Bank"
										/>
										{formErrors.otherBankName && (
											<div className="mt-1 text-xs text-red-600">{formErrors.otherBankName}</div>
										)}
									</div>
								)}
								
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 block">Your Account Name * <span className="text-xs text-gray-500 font-normal">(letters only, no numbers)</span></label>
									<input 
										value={selectedPaymentType === 'JAZZCASH' ? jazzcashAccountName : selectedPaymentType === 'EASYPAISA' ? easypaisaAccountName : otherAccountName} 
										onChange={(e) => { 
											const value = e.target.value
											// Remove numbers from account name
											const cleanedValue = value.replace(/[0-9]/g, '')
											if (selectedPaymentType === 'JAZZCASH') {
												setJazzcashAccountName(cleanedValue)
												setFormErrors({ ...formErrors, jazzcashAccountName: undefined })
											} else if (selectedPaymentType === 'EASYPAISA') {
												setEasypaisaAccountName(cleanedValue)
												setFormErrors({ ...formErrors, easypaisaAccountName: undefined })
											} else {
												setOtherAccountName(cleanedValue)
												setFormErrors({ ...formErrors, otherAccountName: undefined })
											}
										}} 
										className={`input-enhanced w-full ${(selectedPaymentType === 'JAZZCASH' ? formErrors.jazzcashAccountName : selectedPaymentType === 'EASYPAISA' ? formErrors.easypaisaAccountName : formErrors.otherAccountName) ? 'border-red-500 focus:ring-red-500' : ''}`} 
										placeholder="Enter your account name"
									/>
									{(selectedPaymentType === 'JAZZCASH' ? formErrors.jazzcashAccountName : selectedPaymentType === 'EASYPAISA' ? formErrors.easypaisaAccountName : formErrors.otherAccountName) && (
										<div className="mt-1 text-xs text-red-600">
											{selectedPaymentType === 'JAZZCASH' ? formErrors.jazzcashAccountName : selectedPaymentType === 'EASYPAISA' ? formErrors.easypaisaAccountName : formErrors.otherAccountName}
										</div>
									)}
								</div>
								
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1.5 block">Your Account Number * <span className="text-xs text-gray-500">(numbers only)</span></label>
									<input 
										type="tel"
										value={selectedPaymentType === 'JAZZCASH' ? jazzcashAccountNumber : selectedPaymentType === 'EASYPAISA' ? easypaisaAccountNumber : otherAccountNumber} 
										onChange={(e) => { 
											const value = e.target.value
											// Only allow numbers
											const cleanedValue = value.replace(/[^0-9]/g, '')
											if (selectedPaymentType === 'JAZZCASH') {
												setJazzcashAccountNumber(cleanedValue)
												setFormErrors({ ...formErrors, jazzcashAccountNumber: undefined })
											} else if (selectedPaymentType === 'EASYPAISA') {
												setEasypaisaAccountNumber(cleanedValue)
												setFormErrors({ ...formErrors, easypaisaAccountNumber: undefined })
											} else {
												setOtherAccountNumber(cleanedValue)
												setFormErrors({ ...formErrors, otherAccountNumber: undefined })
											}
										}} 
										className={`input-enhanced w-full ${(selectedPaymentType === 'JAZZCASH' ? formErrors.jazzcashAccountNumber : selectedPaymentType === 'EASYPAISA' ? formErrors.easypaisaAccountNumber : formErrors.otherAccountNumber) ? 'border-red-500 focus:ring-red-500' : ''}`} 
										placeholder="e.g., 03001234567"
									/>
									{(selectedPaymentType === 'JAZZCASH' ? formErrors.jazzcashAccountNumber : selectedPaymentType === 'EASYPAISA' ? formErrors.easypaisaAccountNumber : formErrors.otherAccountNumber) && (
										<div className="mt-1 text-xs text-red-600">
											{selectedPaymentType === 'JAZZCASH' ? formErrors.jazzcashAccountNumber : selectedPaymentType === 'EASYPAISA' ? formErrors.easypaisaAccountNumber : formErrors.otherAccountNumber}
										</div>
									)}
								</div>
							</div>

							{/* Action Buttons */}
							<div className="mt-6 flex gap-3">
								<button 
									onClick={() => {
										setShowPaymentDetailsDialog(false)
										setSelectedPaymentType(null)
										setEditingJazzCash(false)
										setEditingEasyPaisa(false)
										setEditingPaymentIndex(null)
									}}
									className="btn-secondary flex-1"
								>
									Cancel
								</button>
								<button 
									onClick={async () => {
										let accountName = ''
										let accountNumber = ''
										
										if (selectedPaymentType === 'JAZZCASH') {
											accountName = jazzcashAccountName.trim()
											accountNumber = jazzcashAccountNumber.trim()
											if (!accountName) {
												setFormErrors({ ...formErrors, jazzcashAccountName: 'Account name is required' })
												return
											}
											if (/[0-9]/.test(accountName)) {
												setFormErrors({ ...formErrors, jazzcashAccountName: 'Account name should not contain numbers' })
												return
											}
											if (!accountNumber) {
												setFormErrors({ ...formErrors, jazzcashAccountNumber: 'Account number is required' })
												return
											}
											if (!/^[0-9]+$/.test(accountNumber)) {
												setFormErrors({ ...formErrors, jazzcashAccountNumber: 'Account number should contain only numbers' })
												return
											}
										} else if (selectedPaymentType === 'EASYPAISA') {
											accountName = easypaisaAccountName.trim()
											accountNumber = easypaisaAccountNumber.trim()
											if (!accountName) {
												setFormErrors({ ...formErrors, easypaisaAccountName: 'Account name is required' })
												return
											}
											if (/[0-9]/.test(accountName)) {
												setFormErrors({ ...formErrors, easypaisaAccountName: 'Account name should not contain numbers' })
												return
											}
											if (!accountNumber) {
												setFormErrors({ ...formErrors, easypaisaAccountNumber: 'Account number is required' })
												return
											}
											if (!/^[0-9]+$/.test(accountNumber)) {
												setFormErrors({ ...formErrors, easypaisaAccountNumber: 'Account number should contain only numbers' })
												return
											}
										} else {
											if (!otherBankName.trim()) {
												setFormErrors({ ...formErrors, otherBankName: 'Bank name is required' })
												return
											}
											accountName = otherAccountName.trim()
											accountNumber = otherAccountNumber.trim()
											if (!accountName) {
												setFormErrors({ ...formErrors, otherAccountName: 'Account name is required' })
												return
											}
											if (/[0-9]/.test(accountName)) {
												setFormErrors({ ...formErrors, otherAccountName: 'Account name should not contain numbers' })
												return
											}
											if (!accountNumber) {
												setFormErrors({ ...formErrors, otherAccountNumber: 'Account number is required' })
												return
											}
											if (!/^[0-9]+$/.test(accountNumber)) {
												setFormErrors({ ...formErrors, otherAccountNumber: 'Account number should contain only numbers' })
												return
											}
										}
										
										// Set selected account based on the account type
										if (selectedPaymentType === 'JAZZCASH') {
											setSelectedAccount({
												type: 'JAZZCASH',
												accountName,
												accountNumber,
												bankName: jazzcashBankName || 'JazzCash'
											})
										} else if (selectedPaymentType === 'EASYPAISA') {
											setSelectedAccount({
												type: 'EASYPAISA',
												accountName,
												accountNumber,
												bankName: easypaisaBankName || 'EasyPaisa'
											})
										} else {
											setSelectedAccount({
												type: 'BANK',
												accountName,
												accountNumber,
												bankName: otherBankName.trim(),
												index: editingPaymentIndex !== null ? editingPaymentIndex : undefined
											})
										}
										
										// If editing, save immediately
										if ((selectedPaymentType === 'JAZZCASH' && editingJazzCash) || 
											(selectedPaymentType === 'EASYPAISA' && editingEasyPaisa) ||
											(selectedPaymentType === 'OTHER' && editingPaymentIndex !== null)) {
											// Auto-save the updated payment method
											if (session?.user?.email) {
												try {
													const existingPaymentMethods = userProfile?.paymentMethods || {
														jazzcash: { accountName: '', accountNumber: '', bankName: '' },
														easypaisa: { accountName: '', accountNumber: '', bankName: '' },
														other: []
													}
													
													const updatedPaymentMethods = {
														jazzcash: existingPaymentMethods.jazzcash || { accountName: '', accountNumber: '', bankName: '' },
														easypaisa: existingPaymentMethods.easypaisa || { accountName: '', accountNumber: '', bankName: '' },
														other: Array.isArray(existingPaymentMethods.other) ? [...existingPaymentMethods.other] : []
													}
													
													if (selectedPaymentType === 'JAZZCASH' && editingJazzCash) {
														updatedPaymentMethods.jazzcash = {
															accountName: jazzcashAccountName,
															accountNumber: jazzcashAccountNumber,
															bankName: jazzcashBankName || 'JazzCash'
														}
													} else if (selectedPaymentType === 'EASYPAISA' && editingEasyPaisa) {
														updatedPaymentMethods.easypaisa = {
															accountName: easypaisaAccountName,
															accountNumber: easypaisaAccountNumber,
															bankName: easypaisaBankName || 'EasyPaisa'
														}
													} else if (selectedPaymentType === 'OTHER' && editingPaymentIndex !== null) {
														updatedPaymentMethods.other[editingPaymentIndex] = {
															bankName: otherBankName,
															accountName: otherAccountName,
															accountNumber: otherAccountNumber
														}
													}
													
													await fetch('/api/account', {
														method: 'PUT',
														headers: { 'Content-Type': 'application/json' },
														body: JSON.stringify({ paymentMethods: updatedPaymentMethods })
													})
													
													// Reload user profile
													const profileRes = await fetch('/api/account', { cache: 'no-store' })
													const profileJson = await profileRes.json()
													if (profileJson?.data) {
														setUserProfile(profileJson.data)
													}
													
													toast.success('Payment method updated')
												} catch (error) {
													console.error('Failed to update payment method:', error)
													toast.error('Failed to update payment method')
												}
											}
											setEditingJazzCash(false)
											setEditingEasyPaisa(false)
											setEditingPaymentIndex(null)
										} else {
											// If adding new, show save prompt
											setShowSavePrompt(true)
										}
										
										setShowPaymentDetailsDialog(false)
										setSelectedPaymentType(null)
									}}
									className="btn-primary flex-1"
								>
									Confirm
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Save to Profile Prompt */}
			{showSavePrompt && method !== 'COD' && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowSavePrompt(false)}>
					<div 
						className="bg-white  shadow-xl w-full max-w-md mx-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-4 sm:p-6">
							<h3 className="text-lg font-semibold mb-2">Save Payment Method?</h3>
							<p className="text-sm text-gray-600 mb-4">Would you like to save this payment method to your account for faster checkout next time?</p>
							<div className="flex gap-3">
								<button 
									onClick={async () => {
										if (session?.user?.email) {
											try {
												// Get existing payment methods to merge with
												const existingPaymentMethods = userProfile?.paymentMethods || {
													jazzcash: { accountName: '', accountNumber: '', bankName: '' },
													easypaisa: { accountName: '', accountNumber: '', bankName: '' },
													other: []
												}
												
												const updatedPaymentMethods = {
													jazzcash: existingPaymentMethods.jazzcash || { accountName: '', accountNumber: '', bankName: '' },
													easypaisa: existingPaymentMethods.easypaisa || { accountName: '', accountNumber: '', bankName: '' },
													other: Array.isArray(existingPaymentMethods.other) ? [...existingPaymentMethods.other] : []
												}
												
												if (method === 'JAZZCASH' && jazzcashAccountName && jazzcashAccountNumber) {
													updatedPaymentMethods.jazzcash = {
														accountName: jazzcashAccountName,
														accountNumber: jazzcashAccountNumber,
														bankName: jazzcashBankName || 'JazzCash'
													}
												} else if (method === 'EASYPAISA' && easypaisaAccountName && easypaisaAccountNumber) {
													updatedPaymentMethods.easypaisa = {
														accountName: easypaisaAccountName,
														accountNumber: easypaisaAccountNumber,
														bankName: easypaisaBankName || 'EasyPaisa'
													}
												} else if (selectedAccount?.type === 'BANK' && otherBankName && otherAccountName && otherAccountNumber) {
													updatedPaymentMethods.other.push({
														bankName: otherBankName,
														accountName: otherAccountName,
														accountNumber: otherAccountNumber
													})
												}
												
												await fetch('/api/account', {
													method: 'PUT',
													headers: { 'Content-Type': 'application/json' },
													body: JSON.stringify({ paymentMethods: updatedPaymentMethods })
												})
												
												// Reload user profile
												const profileRes = await fetch('/api/account', { cache: 'no-store' })
												const profileJson = await profileRes.json()
												if (profileJson?.data) {
													setUserProfile(profileJson.data)
												}
												
												toast.success('Payment method saved to profile')
											} catch (error) {
												console.error('Failed to save payment method:', error)
											}
										}
										setShowSavePrompt(false)
									}}
									className="btn-primary flex-1"
								>
									Save
								</button>
								<button 
									onClick={() => setShowSavePrompt(false)}
									className="btn-secondary flex-1"
								>
									Skip
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
