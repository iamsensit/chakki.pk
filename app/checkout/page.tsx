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
					
					// Load delivery location (default to Lahore if not set)
					const loc = (locationJson.success && locationJson.data?.address) ? locationJson.data : {
						address: 'Model Town, Lahore, Pakistan',
						city: 'Lahore',
						latitude: 31.4826,
						longitude: 74.3262
					}

					setUserDeliveryLocation({
						address: loc.address,
						city: loc.city || 'Lahore',
						latitude: loc.latitude || 31.4826,
						longitude: loc.longitude || 74.3262
					})
					// Pre-fill address and city
					setForm(prev => ({
						...prev,
						address: loc.address,
						city: loc.city || 'Lahore'
					}))
				})
				.catch(() => {
					// Fallback to Lahore on error
					setUserDeliveryLocation({
						address: 'Model Town, Lahore, Pakistan',
						city: 'Lahore',
						latitude: 31.4826,
						longitude: 74.3262
					})
				})
				.finally(() => setLocationLoading(false))
		} else {
			setUserDeliveryLocation({
				address: 'Model Town, Lahore, Pakistan',
				city: 'Lahore',
				latitude: 31.4826,
				longitude: 74.3262
			})
			setLocationLoading(false)
		}

	}, [session])



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
		
		// Sync local cart to server: use PUT to set quantities (not POST which adds and would double prices)
		setLoading(true)
		try {
			const res = await fetch('/api/cart', { cache: 'no-store' })
			if (res.ok) {
				const json = await res.json()
				const serverItems = Array.isArray(json?.data?.items) ? json.data.items : []
				for (const item of items) {
					const onServer = serverItems.find((s: any) => s.productId === item.productId && String(s.variantId || '') === String(item.variantId || ''))
					if (onServer) {
						if (onServer.quantity !== item.quantity) {
							await fetch('/api/cart', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }) })
						}
					} else {
						await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }) })
					}
				}
			}
		} catch (error) {
			console.error('Error syncing cart:', error)
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
		<div className="bg-slate-50/50 min-h-screen py-6 sm:py-10 pb-20 md:pb-16">
			<div className="container-pg">
				{/* Top Header & Stepper */}
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-[#E2E8F0] mb-8">
					<div>
						<div className="flex items-center gap-2 text-xs font-semibold text-[#718096] mb-1">
							<Link href="/cart" className="hover:text-[#7EB338] transition-colors">Cart</Link>
							<span>/</span>
							<span className="text-[#2D3748]">Checkout</span>
						</div>
						<h1 className="text-2xl sm:text-3xl font-black text-[#2D3748] tracking-tight">Express Checkout</h1>
						<p className="text-xs text-[#718096]">Doorstep delivery across Lahore, Karachi & Islamabad</p>
					</div>
					<div className="w-full md:w-auto min-w-[320px]">
						<Stepper step={step} />
					</div>
				</div>

				{step === 0 && (
					<div className="grid gap-6 lg:grid-cols-12 items-start">
						{/* Left Column: Details & Payment */}
						<div className="lg:col-span-8 space-y-6">
							<div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
								{locationLoading ? (
									<div className="animate-pulse space-y-4">
										<div className="h-6 bg-slate-100 rounded-lg w-1/3" />
										<div className="h-12 bg-slate-100 rounded-2xl" />
										<div className="h-12 bg-slate-100 rounded-2xl" />
									</div>
								) : !userDeliveryLocation ? (
									<div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 text-center space-y-3">
										<MapPin className="h-8 w-8 text-amber-600 mx-auto" />
										<p className="text-amber-900 font-bold text-sm sm:text-base">Please select your delivery location first</p>
										<p className="text-xs text-amber-700 max-w-md mx-auto">You need to set your delivery address before proceeding with checkout.</p>
										<Link
											href="/change-location?redirect=/checkout"
											className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#7EB338] hover:bg-[#6fa02f] text-white text-xs font-bold shadow-sm transition-all"
										>
											<MapPin className="h-3.5 w-3.5" />
											<span>Select Delivery Location</span>
										</Link>
									</div>
								) : (
									<>
										{/* Customer Info Section */}
										<div>
											<h2 className="text-sm font-extrabold text-[#2D3748] uppercase tracking-wider mb-4 flex items-center gap-2">
												<span className="h-2 w-2 rounded-full bg-[#7EB338]" />
												<span>1. Customer & Contact Details</span>
											</h2>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<div>
													<label className="text-xs font-bold text-[#2D3748] mb-1.5 block">Full Name</label>
													<input 
														className={`w-full rounded-2xl border border-[#E2E8F0] bg-slate-50 px-4 py-3 text-xs font-semibold text-[#2D3748] focus:outline-none ${formErrors.name ? 'border-red-500' : ''}`} 
														value={form.name} 
														readOnly
														disabled
													/>
													<p className="mt-1 text-[11px] text-[#718096]">From your verified account</p>
													{formErrors.name && <div className="mt-1 text-xs text-red-600">{formErrors.name}</div>}
												</div>

												<div>
													<label className="text-xs font-bold text-[#2D3748] mb-1.5 block">Email Address</label>
													<input 
														className="w-full rounded-2xl border border-[#E2E8F0] bg-slate-50 px-4 py-3 text-xs font-semibold text-[#2D3748] focus:outline-none" 
														value={userProfile?.email || ''} 
														readOnly
														disabled
													/>
													<p className="mt-1 text-[11px] text-[#718096]">Order updates will be sent here</p>
												</div>

												<div className="sm:col-span-2">
													<label className="text-xs font-bold text-[#2D3748] mb-1.5 flex items-center gap-2">
														<Phone className="h-3.5 w-3.5 text-[#7EB338]" />
														<span>Mobile Phone Number (For Delivery Rider)</span>
													</label>
													{userProfile?.phone && !form.phone ? (
														<div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#E2E8F0] bg-slate-50">
															<span className="text-xs font-bold text-[#2D3748]">{userProfile.phone}</span>
															<button
																type="button"
																onClick={() => {
																	setForm({ ...form, phone: userProfile.phone || '' })
																	setPhoneSaved(false)
																}}
																className="flex items-center gap-1 text-xs font-bold text-[#7EB338] hover:text-[#6fa02f]"
																title="Edit phone number"
															>
																<Edit2 className="h-3.5 w-3.5" />
																<span>Change</span>
															</button>
														</div>
													) : (
														<div className="relative">
															<input 
																type="tel"
																className={`w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-xs font-bold text-[#2D3748] focus:border-[#7EB338] focus:outline-none pr-12 ${formErrors.phone ? 'border-red-500' : ''}`} 
																value={form.phone} 
																onChange={(e) => { 
																	const value = e.target.value
																	const cleanedValue = value.replace(/[^0-9]/g, '')
																	setForm({ ...form, phone: cleanedValue })
																	setFormErrors({ ...formErrors, phone: undefined })
																	setPhoneSaved(false)
																}}
																onKeyDown={(e) => {
																	if (e.key === 'Enter') {
																		e.preventDefault()
																		handleContinue()
																	}
																}}
																placeholder="0300 1234567"
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
																	className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
																	title="Save phone number"
																>
																	{savingPhone ? (
																		<div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
																	) : (
																		<CheckCircle2 className="h-4 w-4" />
																	)}
																</button>
															)}
															{formErrors.phone && <div className="mt-1 text-xs text-red-600">{formErrors.phone}</div>}
														</div>
													)}
												</div>
											</div>
										</div>

										{/* Delivery Address Section */}
										<div className="pt-6 border-t border-[#E2E8F0]">
											<div className="flex items-center justify-between mb-3">
												<h2 className="text-sm font-extrabold text-[#2D3748] uppercase tracking-wider flex items-center gap-2">
													<span className="h-2 w-2 rounded-full bg-[#7EB338]" />
													<span>2. Delivery Address</span>
												</h2>
												<Link
													href="/change-location?redirect=/checkout"
													className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7EB338] hover:text-[#6fa02f] transition-colors"
												>
													<MapPin className="h-3.5 w-3.5" />
													<span>Change Address</span>
												</Link>
											</div>

											<div className="p-4 rounded-2xl border border-[#E2E8F0] bg-slate-50 flex items-start gap-3">
												<div className="p-2 rounded-xl bg-[#7EB338]/10 text-[#7EB338] flex-shrink-0 mt-0.5">
													<MapPin className="h-4 w-4" />
												</div>
												<div>
													<p className="text-xs font-extrabold text-[#2D3748]">
														{userDeliveryLocation.address}
													</p>
													<p className="text-[11px] font-semibold text-[#718096] mt-0.5">
														{userDeliveryLocation.city || 'Lahore'}
													</p>
												</div>
											</div>
											{formErrors.address && <div className="mt-1 text-xs text-red-600">{formErrors.address}</div>}
										</div>

										{/* Payment Method Section */}
										<div className="pt-6 border-t border-[#E2E8F0]">
											<h2 className="text-sm font-extrabold text-[#2D3748] uppercase tracking-wider mb-4 flex items-center gap-2">
												<span className="h-2 w-2 rounded-full bg-[#7EB338]" />
												<span>3. Payment Method</span>
											</h2>

											<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
												{/* COD */}
												<button 
													type="button"
													onClick={() => setMethod('COD')} 
													className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
														method === 'COD' 
															? 'border-[#7EB338] bg-[#7EB338]/5 shadow-xs ring-2 ring-[#7EB338]/20' 
															: 'border-[#E2E8F0] hover:border-slate-300 bg-white'
													}`}
												>
													<div className="h-8 w-8 rounded-full bg-[#7EB338]/10 text-[#7EB338] flex items-center justify-center">
														<Banknote className="h-4 w-4" />
													</div>
													<div>
														<p className="text-xs font-black text-[#2D3748]">Cash on Delivery</p>
														<p className="text-[10px] text-[#718096]">Pay upon delivery</p>
													</div>
												</button>

												{/* JazzCash */}
												<button 
													type="button"
													onClick={() => {
														setMethod('JAZZCASH')
														setShowPaymentMethodDialog(true)
													}} 
													className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
														method === 'JAZZCASH' 
															? 'border-[#7EB338] bg-[#7EB338]/5 shadow-xs ring-2 ring-[#7EB338]/20' 
															: 'border-[#E2E8F0] hover:border-slate-300 bg-white'
													}`}
												>
													<div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-xs">
														JC
													</div>
													<div>
														<p className="text-xs font-black text-[#2D3748]">JazzCash</p>
														<p className="text-[10px] text-[#718096]">Instant online mobile</p>
													</div>
												</button>

												{/* EasyPaisa */}
												<button 
													type="button"
													onClick={() => {
														setMethod('EASYPAISA')
														setShowPaymentMethodDialog(true)
													}} 
													className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
														method === 'EASYPAISA' 
															? 'border-[#7EB338] bg-[#7EB338]/5 shadow-xs ring-2 ring-[#7EB338]/20' 
															: 'border-[#E2E8F0] hover:border-slate-300 bg-white'
													}`}
												>
													<div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">
														EP
													</div>
													<div>
														<p className="text-xs font-black text-[#2D3748]">EasyPaisa</p>
														<p className="text-[10px] text-[#718096]">Direct wallet pay</p>
													</div>
												</button>
											</div>

											{/* Online Details Pill */}
											{method !== 'COD' && (
												<div className="mt-4 p-4 rounded-2xl border border-[#7EB338]/30 bg-[#F5EFE0]/40 text-xs space-y-3">
													<div className="flex items-center justify-between">
														<span className="font-bold text-[#2D3748]">Official Merchant Account:</span>
														<span className="font-black text-base text-[#7EB338]">03004056650</span>
													</div>
													{selectedAccount ? (
														<div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1">
															<p className="text-[11px] text-[#718096]">Your payment account:</p>
															<p className="font-bold text-[#2D3748]">{selectedAccount.bankName} • {selectedAccount.accountName} ({selectedAccount.accountNumber})</p>
															<button 
																type="button"
																onClick={() => setShowPaymentMethodDialog(true)}
																className="text-xs font-bold text-[#7EB338] hover:underline pt-1 block"
															>
																Change Account
															</button>
														</div>
													) : (
														<button 
															type="button"
															onClick={() => setShowPaymentMethodDialog(true)}
															className="w-full py-2.5 rounded-xl bg-[#7EB338] hover:bg-[#6fa02f] text-white font-bold text-xs transition-colors"
														>
															Select Your Sender Account
														</button>
													)}
													{formErrors.paymentMethod && (
														<p className="text-xs font-bold text-red-600">{formErrors.paymentMethod}</p>
													)}
												</div>
											)}
										</div>
									</>
								)}
							</div>
						</div>

						{/* Right Column: Order Summary & Delivery Speed */}
						<div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
							<div className="bg-[#F5EFE0]/60 rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-sm space-y-5">
								<h2 className="text-lg font-black text-[#2D3748] tracking-tight pb-3 border-b border-[#E2E8F0]">
									Order Summary
								</h2>

								{/* Items List */}
								<div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
									{items.map(i => (
										<div key={i.id} className="flex items-center justify-between text-xs gap-2">
											<div className="text-[#2D3748] font-bold truncate flex-1">{i.title} × {i.quantity}</div>
											<div className="font-extrabold text-[#2D3748] flex-shrink-0">{formatCurrencyPKR(i.unitPrice * i.quantity)}</div>
										</div>
									))}
								</div>

								{/* Delivery Speed Selector */}
								<div className="pt-3 border-t border-[#E2E8F0] space-y-2">
									<label className="text-xs font-black text-[#2D3748] uppercase tracking-wider block">
										Delivery Speed
									</label>
									<div className="space-y-2">
										<label className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${deliveryType === 'STANDARD' ? 'border-[#7EB338] bg-white ring-2 ring-[#7EB338]/15' : 'border-[#E2E8F0] bg-white/50'}`}>
											<div className="flex items-center gap-2.5">
												<input
													type="radio"
													name="deliveryType"
													value="STANDARD"
													checked={deliveryType === 'STANDARD'}
													onChange={() => setDeliveryType('STANDARD')}
													className="h-4 w-4 text-[#7EB338] focus:ring-[#7EB338]"
												/>
												<div>
													<p className="text-xs font-bold text-[#2D3748]">Standard Delivery</p>
													<p className="text-[10px] text-[#718096]">3-5 Hours Delivery</p>
												</div>
											</div>
											<span className="text-xs font-black text-[#2D3748]">Rs. 200</span>
										</label>

										<label className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${deliveryType === 'EXPRESS' ? 'border-[#7EB338] bg-white ring-2 ring-[#7EB338]/15' : 'border-[#E2E8F0] bg-white/50'}`}>
											<div className="flex items-center gap-2.5">
												<input
													type="radio"
													name="deliveryType"
													value="EXPRESS"
													checked={deliveryType === 'EXPRESS'}
													onChange={() => setDeliveryType('EXPRESS')}
													className="h-4 w-4 text-[#7EB338] focus:ring-[#7EB338]"
												/>
												<div>
													<p className="text-xs font-bold text-[#2D3748]">Express Delivery ⚡</p>
													<p className="text-[10px] text-[#718096]">Within 30-45 Mins</p>
												</div>
											</div>
											<span className="text-xs font-black text-[#F08C38]">Rs. 500</span>
										</label>
									</div>
								</div>

								{/* Cost Totals */}
								<div className="pt-3 border-t border-[#E2E8F0] space-y-2 text-xs">
									<div className="flex items-center justify-between text-[#718096]">
										<span>Subtotal</span>
										<span className="font-bold text-[#2D3748]">{formatCurrencyPKR(subtotal)}</span>
									</div>
									<div className="flex items-center justify-between text-[#718096]">
										<span>Delivery Charges</span>
										<span className="font-bold text-[#2D3748]">{formatCurrencyPKR(deliveryFee)}</span>
									</div>
									<div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
										<span className="text-sm font-black text-[#2D3748]">Total Amount</span>
										<span className="text-lg font-black text-[#7EB338]">{formatCurrencyPKR(total)}</span>
									</div>
								</div>

								<button 
									disabled={loading} 
									className="w-full py-4 rounded-2xl bg-[#7EB338] hover:bg-[#6fa02f] text-white text-sm font-black shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center tracking-wide" 
									onClick={handleContinue}
								>
									Continue to Review
								</button>
							</div>
						</div>
					</div>
				)}

				{step === 1 && (
					<div className="grid gap-6 lg:grid-cols-12 items-start">
						{/* Left Column: Review Details */}
						<div className="lg:col-span-8 space-y-6">
							<div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
								<h2 className="text-lg font-black text-[#2D3748] pb-3 border-b border-[#E2E8F0]">
									Review Your Order
								</h2>

								{/* Delivery Info */}
								<div className="p-4 rounded-2xl bg-slate-50 border border-[#E2E8F0] space-y-3">
									<div className="flex items-center justify-between">
										<h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2D3748] flex items-center gap-2">
											<MapPin className="h-3.5 w-3.5 text-[#7EB338]" />
											<span>Shipping & Delivery Details</span>
										</h3>
										<button onClick={() => setStep(0)} className="text-xs font-bold text-[#7EB338] hover:underline">
											Edit
										</button>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
										<div><span className="text-[#718096]">Recipient:</span> <strong className="text-[#2D3748]">{form.name}</strong></div>
										<div><span className="text-[#718096]">Contact:</span> <strong className="text-[#2D3748]">{form.phone}</strong></div>
										<div className="sm:col-span-2"><span className="text-[#718096]">Address:</span> <strong className="text-[#2D3748]">{userDeliveryLocation?.address || form.address}, {userDeliveryLocation?.city || form.city}</strong></div>
										<div><span className="text-[#718096]">Speed:</span> <strong className="text-[#2D3748]">{deliveryType === 'STANDARD' ? 'Standard (3-5 hours)' : 'Express ⚡ (30 mins)'}</strong></div>
									</div>
								</div>

								{/* Payment Info */}
								<div className="p-4 rounded-2xl bg-slate-50 border border-[#E2E8F0] space-y-3">
									<div className="flex items-center justify-between">
										<h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2D3748] flex items-center gap-2">
											<CreditCard className="h-3.5 w-3.5 text-[#7EB338]" />
											<span>Payment Details</span>
										</h3>
										<button onClick={() => setStep(0)} className="text-xs font-bold text-[#7EB338] hover:underline">
											Edit
										</button>
									</div>
									<p className="text-xs font-bold text-[#2D3748]">
										{method === 'COD' ? '💵 Cash on Delivery (Pay upon arrival)' : `📱 ${method} Online Transfer`}
									</p>
								</div>
							</div>
						</div>

						{/* Right Column: Final Place Order */}
						<div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
							<div className="bg-[#F5EFE0]/60 rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-sm space-y-5">
								<h2 className="text-lg font-black text-[#2D3748] tracking-tight pb-3 border-b border-[#E2E8F0]">
									Payment Summary
								</h2>

								<div className="space-y-2 text-xs">
									<div className="flex items-center justify-between text-[#718096]">
										<span>Subtotal</span>
										<span className="font-bold text-[#2D3748]">{formatCurrencyPKR(subtotal)}</span>
									</div>
									<div className="flex items-center justify-between text-[#718096]">
										<span>Delivery</span>
										<span className="font-bold text-[#2D3748]">{formatCurrencyPKR(deliveryFee)}</span>
									</div>
									<div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
										<span className="text-sm font-black text-[#2D3748]">Grand Total</span>
										<span className="text-xl font-black text-[#7EB338]">{formatCurrencyPKR(total)}</span>
									</div>
								</div>

								<button 
									disabled={loading} 
									className="w-full py-4 rounded-2xl bg-[#7EB338] hover:bg-[#6fa02f] text-white text-sm font-black shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center tracking-wide disabled:opacity-60" 
									onClick={placeOrder}
								>
									{loading ? 'Processing Order...' : 'Confirm & Place Order'}
								</button>
								<button 
									className="w-full py-3 rounded-2xl border border-[#E2E8F0] bg-white hover:bg-slate-100 text-xs font-bold text-[#2D3748] transition-colors" 
									onClick={() => setStep(0)}
								>
									Back to Edit
								</button>
							</div>
						</div>
					</div>
				)}

				{step === 2 && (
					<div className="max-w-xl mx-auto my-8 bg-white rounded-3xl border border-[#E2E8F0] p-8 sm:p-12 text-center shadow-lg space-y-6">
						<div className="h-20 w-20 rounded-full bg-[#7EB338]/15 text-[#7EB338] mx-auto flex items-center justify-center shadow-xs">
							<CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
						</div>
						<div>
							<h2 className="text-2xl sm:text-3xl font-black text-[#2D3748] mb-2">
								Thank You! Order Confirmed
							</h2>
							<p className="text-xs sm:text-sm text-[#718096]">
								Your order has been received and is being prepared fresh at the chakki mill.
							</p>
						</div>

						{orderId && (
							<div className="p-4 rounded-2xl bg-[#F5EFE0] border border-[#E2E8F0] text-xs space-y-2">
								<span className="text-[#718096] font-semibold">Your Order Reference ID</span>
								<div className="flex items-center justify-center gap-2">
									<span className="text-base font-black text-[#2D3748] tracking-wider select-all">{orderId}</span>
									<button
										type="button"
										onClick={() => {
											navigator.clipboard.writeText(orderId)
											toast.success('Order ID copied to clipboard!')
										}}
										className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:bg-slate-50 text-xs font-bold text-[#718096] hover:text-[#2D3748] transition-colors"
										title="Copy Order ID"
									>
										Copy
									</button>
								</div>
							</div>
						)}

						<div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
							<Link
								href={`/orders?id=${orderId || ''}` as any}
								className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#7EB338] hover:bg-[#6fa02f] text-white text-xs font-black shadow-md hover:shadow-lg transition-all"
							>
								Track Order Status
							</Link>
							<Link
								href="/products"
								className="w-full sm:w-auto px-7 py-3.5 rounded-full border border-[#E2E8F0] bg-white hover:bg-slate-100 text-[#2D3748] text-xs font-bold transition-all"
							>
								Continue Shopping
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
														className="p-2 text-gray-600 hover:text-brand-accent hover:bg-brand-light  transition-colors"
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
														className="p-2 text-gray-600 hover:text-brand-accent hover:bg-brand-light  transition-colors"
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
														className="p-2 text-gray-600 hover:text-brand-accent hover:bg-brand-light  transition-colors"
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
							<form 
								id="payment-details-form"
								onSubmit={(e) => {
									e.preventDefault();
									// Trigger the save button click
									const saveButton = document.querySelector('[data-payment-save-button]') as HTMLButtonElement;
									if (saveButton) saveButton.click();
								}} 
								className="mt-6 space-y-4"
							>
								{selectedPaymentType === 'OTHER' && (
									<div>
										<label className="text-sm font-medium text-gray-700 mb-1.5 block">Bank Name *</label>
										<input 
											value={otherBankName} 
											onChange={(e) => {
												setOtherBankName(e.target.value)
												setFormErrors({ ...formErrors, otherBankName: undefined })
											}}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													const saveButton = document.querySelector('[data-payment-save-button]') as HTMLButtonElement;
													if (saveButton) saveButton.click();
												}
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
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												const saveButton = document.querySelector('[data-payment-save-button]') as HTMLButtonElement;
												if (saveButton) saveButton.click();
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
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												const saveButton = document.querySelector('[data-payment-save-button]') as HTMLButtonElement;
												if (saveButton) saveButton.click();
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
							</form>

							{/* Action Buttons */}
							<div className="mt-6 flex gap-3">
								<button 
									type="button"
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
									type="submit"
									form="payment-details-form"
									data-payment-save-button
									onClick={async (e) => {
										e.preventDefault();
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
		</div>
	)
}

