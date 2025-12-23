"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { CreditCard, Plus, Edit2, Trash2 } from 'lucide-react'

// Use single bank.png icon for all other banks
const getBankIcon = (bankName: string): string | null => {
	if (!bankName) return null
	// Use single bank.png icon for all other banks
	return '/bank.png'
}

export default function PaymentMethodsClient() {
	const [loading, setLoading] = useState(true)
	const [paymentMethods, setPaymentMethods] = useState({
		jazzcash: { accountName: '', accountNumber: '', bankName: '' },
		easypaisa: { accountName: '', accountNumber: '', bankName: '' },
		other: [] as Array<{ bankName: string; accountName: string; accountNumber: string }>
	})
	const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
	const [selectedBankType, setSelectedBankType] = useState<'JAZZCASH' | 'EASYPAISA' | 'OTHER' | null>(null)
	const [newPaymentData, setNewPaymentData] = useState({ bankName: '', accountName: '', accountNumber: '' })
	const [showBankList, setShowBankList] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [editingIndex, setEditingIndex] = useState<number | null>(null) // For editing other banks
	const [isEditing, setIsEditing] = useState(false) // For editing JazzCash/EasyPaisa

	useEffect(() => {
		;(async () => {
			try {
				const res = await fetch('/api/account', { cache: 'no-store' })
				const json = await res.json()
				if (json?.data) {
					setPaymentMethods({
						jazzcash: json.data.paymentMethods?.jazzcash || { accountName: '', accountNumber: '', bankName: '' },
						easypaisa: json.data.paymentMethods?.easypaisa || { accountName: '', accountNumber: '', bankName: '' },
						other: json.data.paymentMethods?.other || []
					})
				}
			} catch (e) {
				toast.error('Failed to load payment methods')
			} finally {
				setLoading(false)
			}
		})()
	}, [])

	async function savePaymentMethod() {
		if (!newPaymentData.accountName.trim() || !newPaymentData.accountNumber.trim()) {
			toast.error('Please fill all required fields')
			return
		}
		if (selectedBankType === 'OTHER' && !newPaymentData.bankName.trim()) {
			toast.error('Please enter bank name')
			return
		}
		
		setSubmitting(true)
		const updatedMethods = { ...paymentMethods }
		
		if (selectedBankType === 'JAZZCASH') {
			updatedMethods.jazzcash = {
				accountName: newPaymentData.accountName,
				accountNumber: newPaymentData.accountNumber,
				bankName: 'JazzCash'
			}
		} else if (selectedBankType === 'EASYPAISA') {
			updatedMethods.easypaisa = {
				accountName: newPaymentData.accountName,
				accountNumber: newPaymentData.accountNumber,
				bankName: 'EasyPaisa'
			}
		} else if (selectedBankType === 'OTHER') {
			if (editingIndex !== null) {
				// Update existing other bank
				updatedMethods.other[editingIndex] = {
					bankName: newPaymentData.bankName,
					accountName: newPaymentData.accountName,
					accountNumber: newPaymentData.accountNumber
				}
			} else {
				// Add new other bank
				updatedMethods.other = [...updatedMethods.other, {
					bankName: newPaymentData.bankName,
					accountName: newPaymentData.accountName,
					accountNumber: newPaymentData.accountNumber
				}]
			}
		}
		
		try {
			const res = await fetch('/api/account', { 
				method: 'PUT', 
				headers: { 'Content-Type': 'application/json' }, 
				body: JSON.stringify({ paymentMethods: updatedMethods }) 
			})
			const responseData = await res.json()
			if (!res.ok) throw new Error(responseData.message || 'Update failed')
			toast.success(isEditing || editingIndex !== null ? 'Payment method updated' : 'Payment method saved')
			// Reload payment methods to ensure sync with database
			const reloadRes = await fetch('/api/account', { cache: 'no-store' })
			const reloadJson = await reloadRes.json()
			if (reloadJson?.data?.paymentMethods) {
				setPaymentMethods({
					jazzcash: reloadJson.data.paymentMethods.jazzcash || { accountName: '', accountNumber: '', bankName: '' },
					easypaisa: reloadJson.data.paymentMethods.easypaisa || { accountName: '', accountNumber: '', bankName: '' },
					other: Array.isArray(reloadJson.data.paymentMethods.other) ? reloadJson.data.paymentMethods.other : []
				})
			} else {
				// Fallback to local state if reload fails
				setPaymentMethods(updatedMethods)
			}
			setShowAddPaymentDialog(false)
			setSelectedBankType(null)
			setShowBankList(false)
			setNewPaymentData({ bankName: '', accountName: '', accountNumber: '' })
			setIsEditing(false)
			setEditingIndex(null)
		} catch (e: any) {
			toast.error(e.message || 'Could not save payment method')
		} finally {
			setSubmitting(false)
		}
	}

	async function deletePaymentMethod(type: 'JAZZCASH' | 'EASYPAISA' | 'OTHER', index?: number) {
		if (!confirm('Are you sure you want to delete this payment method?')) return
		
		setSubmitting(true)
		const updatedMethods = { ...paymentMethods }
		
		if (type === 'JAZZCASH') {
			updatedMethods.jazzcash = { accountName: '', accountNumber: '', bankName: '' }
		} else if (type === 'EASYPAISA') {
			updatedMethods.easypaisa = { accountName: '', accountNumber: '', bankName: '' }
		} else if (type === 'OTHER' && index !== undefined) {
			updatedMethods.other = updatedMethods.other.filter((_, i) => i !== index)
		}
		
		try {
			const res = await fetch('/api/account', { 
				method: 'PUT', 
				headers: { 'Content-Type': 'application/json' }, 
				body: JSON.stringify({ paymentMethods: updatedMethods }) 
			})
			if (!res.ok) throw new Error('Delete failed')
			toast.success('Payment method deleted')
			setPaymentMethods(updatedMethods)
		} catch (e: any) {
			toast.error(e.message || 'Could not delete payment method')
		} finally {
			setSubmitting(false)
		}
	}

	if (loading) return <div className="skeleton h-48" />

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* Header with Add Button */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
				<h2 className="text-lg sm:text-xl font-bold text-slate-900">Payment Methods</h2>
				<button
					type="button"
					onClick={() => {
						setSelectedBankType(null)
						setIsEditing(false)
						setEditingIndex(null)
						setNewPaymentData({ bankName: '', accountName: '', accountNumber: '' })
						setShowAddPaymentDialog(true)
					}}
					className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-accent px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white hover:bg-orange-600 transition-colors"
				>
					<Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
					<span className="hidden sm:inline">Add new payment method</span>
					<span className="sm:hidden">Add Payment</span>
				</button>
			</div>

			{/* JazzCash Section */}
			<div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
				<h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4">JazzCash</h3>
				{paymentMethods.jazzcash.accountNumber ? (
					<div className="border border-slate-200 rounded-lg p-3 sm:p-4 bg-white">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
								<img src="/jazzcash.png" alt="JazzCash" className="h-7 w-auto sm:h-8 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
								<div className="min-w-0 flex-1">
									<div className="font-semibold text-xs sm:text-sm text-slate-900 truncate">JazzCash</div>
									<div className="text-xs sm:text-sm text-slate-600 mt-0.5 truncate">{paymentMethods.jazzcash.accountName} • {paymentMethods.jazzcash.accountNumber}</div>
								</div>
							</div>
							<div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
								<button
									onClick={() => {
										setSelectedBankType('JAZZCASH')
										setIsEditing(true)
										setNewPaymentData({
											bankName: 'JazzCash',
											accountName: paymentMethods.jazzcash.accountName,
											accountNumber: paymentMethods.jazzcash.accountNumber
										})
										setShowAddPaymentDialog(true)
									}}
									className="p-1.5 sm:p-2 text-slate-600 hover:text-brand-accent hover:bg-orange-50 rounded-lg transition-colors"
									title="Edit"
								>
									<Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								</button>
								<button
									onClick={() => deletePaymentMethod('JAZZCASH')}
									className="p-1.5 sm:p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
									title="Delete"
									disabled={submitting}
								>
									<Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								</button>
							</div>
						</div>
					</div>
				) : (
					<div className="text-center py-4 sm:py-6 text-xs sm:text-sm text-slate-500">No JazzCash payment method added</div>
				)}
			</div>

			{/* EasyPaisa Section */}
			<div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
				<h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4">EasyPaisa</h3>
				{paymentMethods.easypaisa.accountNumber ? (
					<div className="border border-slate-200 rounded-lg p-3 sm:p-4 bg-white">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
								<img src="/easypaisa.png" alt="EasyPaisa" className="h-7 w-auto sm:h-8 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
								<div className="min-w-0 flex-1">
									<div className="font-semibold text-xs sm:text-sm text-slate-900 truncate">EasyPaisa</div>
									<div className="text-xs sm:text-sm text-slate-600 mt-0.5 truncate">{paymentMethods.easypaisa.accountName} • {paymentMethods.easypaisa.accountNumber}</div>
								</div>
							</div>
							<div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
								<button
									onClick={() => {
										setSelectedBankType('EASYPAISA')
										setIsEditing(true)
										setNewPaymentData({
											bankName: 'EasyPaisa',
											accountName: paymentMethods.easypaisa.accountName,
											accountNumber: paymentMethods.easypaisa.accountNumber
										})
										setShowAddPaymentDialog(true)
									}}
									className="p-1.5 sm:p-2 text-slate-600 hover:text-brand-accent hover:bg-orange-50 rounded-lg transition-colors"
									title="Edit"
								>
									<Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								</button>
								<button
									onClick={() => deletePaymentMethod('EASYPAISA')}
									className="p-1.5 sm:p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
									title="Delete"
									disabled={submitting}
								>
									<Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								</button>
							</div>
						</div>
					</div>
				) : (
					<div className="text-center py-4 sm:py-6 text-xs sm:text-sm text-slate-500">No EasyPaisa payment method added</div>
				)}
			</div>

			{/* Other Banks Section */}
			<div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
				<h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4">Other Banks</h3>
				{paymentMethods.other.length > 0 ? (
					<div className="space-y-2 sm:space-y-3">
						{paymentMethods.other.map((bank, index) => (
							<div key={index} className="border border-slate-200 rounded-lg p-3 sm:p-4 bg-white">
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
										<img 
											src="/bank.png" 
											alt={bank.bankName} 
											className="h-7 w-auto sm:h-8 object-contain flex-shrink-0" 
											onError={(e) => {
												(e.target as HTMLImageElement).style.display = 'none'
											}} 
										/>
										<div className="min-w-0 flex-1">
											<div className="font-semibold text-xs sm:text-sm text-slate-900 truncate">{bank.bankName}</div>
											<div className="text-xs sm:text-sm text-slate-600 mt-0.5 truncate">{bank.accountName} • {bank.accountNumber}</div>
										</div>
									</div>
									<div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
										<button
											onClick={() => {
												setSelectedBankType('OTHER')
												setEditingIndex(index)
												setIsEditing(false)
												setNewPaymentData({
													bankName: bank.bankName,
													accountName: bank.accountName,
													accountNumber: bank.accountNumber
												})
												setShowAddPaymentDialog(true)
											}}
											className="p-1.5 sm:p-2 text-slate-600 hover:text-brand-accent hover:bg-orange-50 rounded-lg transition-colors"
											title="Edit"
										>
											<Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
										</button>
										<button
											onClick={() => deletePaymentMethod('OTHER', index)}
											className="p-1.5 sm:p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
											title="Delete"
											disabled={submitting}
										>
											<Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-4 sm:py-6 text-xs sm:text-sm text-slate-500">No other bank payment methods added</div>
				)}
			</div>

			{/* Add Payment Method Dialog */}
			{showAddPaymentDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50" onClick={() => setShowAddPaymentDialog(false)}>
					<div 
						className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-4 sm:p-6">
							{!selectedBankType ? (
								<>
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-lg font-semibold">Select Bank</h3>
										<button 
											onClick={() => setShowAddPaymentDialog(false)}
											className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
										>
											×
										</button>
									</div>
									
									<div className="space-y-2 sm:space-y-3">
										<button
											onClick={() => {
												setSelectedBankType('JAZZCASH')
												if (paymentMethods.jazzcash.accountNumber) {
													setIsEditing(true)
													setNewPaymentData({
														bankName: 'JazzCash',
														accountName: paymentMethods.jazzcash.accountName,
														accountNumber: paymentMethods.jazzcash.accountNumber
													})
												} else {
													setIsEditing(false)
													setNewPaymentData({ bankName: 'JazzCash', accountName: '', accountNumber: '' })
												}
											}}
											className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-md hover:border-brand-accent hover:bg-brand-accent/5 transition-all flex items-center justify-between"
										>
											<div className="flex items-center gap-2 sm:gap-3">
												<img src="/jazzcash.png" alt="JazzCash" className="h-6 w-auto sm:h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
												<span className="font-medium text-sm sm:text-base">JazzCash</span>
											</div>
											{paymentMethods.jazzcash.accountNumber && (
												<span className="text-[10px] sm:text-xs text-gray-500">Edit</span>
											)}
										</button>
										
										<button
											onClick={() => {
												setSelectedBankType('EASYPAISA')
												if (paymentMethods.easypaisa.accountNumber) {
													setIsEditing(true)
													setNewPaymentData({
														bankName: 'EasyPaisa',
														accountName: paymentMethods.easypaisa.accountName,
														accountNumber: paymentMethods.easypaisa.accountNumber
													})
												} else {
													setIsEditing(false)
													setNewPaymentData({ bankName: 'EasyPaisa', accountName: '', accountNumber: '' })
												}
											}}
											className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-md hover:border-brand-accent hover:bg-brand-accent/5 transition-all flex items-center justify-between"
										>
											<div className="flex items-center gap-2 sm:gap-3">
												<img src="/easypaisa.png" alt="EasyPaisa" className="h-6 w-auto sm:h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
												<span className="font-medium text-sm sm:text-base">EasyPaisa</span>
											</div>
											{paymentMethods.easypaisa.accountNumber && (
												<span className="text-[10px] sm:text-xs text-gray-500">Edit</span>
											)}
										</button>
										
										<button
											onClick={() => {
												setSelectedBankType('OTHER')
												setNewPaymentData({ bankName: '', accountName: '', accountNumber: '' })
												setShowBankList(true)
											}}
											className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-md hover:border-brand-accent hover:bg-brand-accent/5 transition-all flex items-center gap-2 sm:gap-3"
										>
											<CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
											<span className="font-medium text-sm sm:text-base">Other Bank</span>
										</button>
									</div>
								</>
							) : (
								<>
									<div className="flex items-center justify-between mb-3 sm:mb-4">
										<h3 className="text-base sm:text-lg font-semibold">
											{isEditing || editingIndex !== null ? 'Edit ' : ''}{selectedBankType === 'JAZZCASH' ? 'JazzCash' : selectedBankType === 'EASYPAISA' ? 'EasyPaisa' : 'Other Bank'}
										</h3>
										<button 
											onClick={() => {
												setSelectedBankType(null)
												setShowBankList(false)
												setIsEditing(false)
												setEditingIndex(null)
												setNewPaymentData({ bankName: '', accountName: '', accountNumber: '' })
											}}
											className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl leading-none"
										>
											×
										</button>
									</div>
									
									{selectedBankType === 'OTHER' && showBankList ? (
										<div className="space-y-2 sm:space-y-3">
											<h4 className="text-xs sm:text-sm font-medium mb-2">Select Bank</h4>
											{['HBL', 'UBL', 'Meezan Bank', 'Allied Bank', 'Bank Alfalah', 'MCB Bank', 'Standard Chartered', 'Faysal Bank', 'Askari Bank', 'Bank of Punjab'].map((bankName) => (
												<button
													key={bankName}
													onClick={() => {
														setNewPaymentData(prev => ({ ...prev, bankName }))
														setShowBankList(false)
													}}
													className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-md hover:border-brand-accent hover:bg-brand-accent/5 transition-all text-left flex items-center gap-2 sm:gap-3"
												>
													<img 
														src="/bank.png" 
														alt={bankName} 
														className="h-5 w-auto sm:h-6 object-contain" 
														onError={(e) => {
															(e.target as HTMLImageElement).style.display = 'none'
														}} 
													/>
													<span className="font-medium text-xs sm:text-sm">{bankName}</span>
												</button>
											))}
										</div>
									) : (
										<div className="space-y-3 sm:space-y-4">
											{selectedBankType === 'OTHER' && (
												<div>
													<label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Bank Name *</label>
													<input 
														value={newPaymentData.bankName} 
														onChange={(e) => setNewPaymentData(prev => ({ ...prev, bankName: e.target.value }))} 
														className="w-full h-11 sm:h-[50px] rounded-lg border border-[#e5e5e5] px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all" 
														placeholder="Enter bank name"
													/>
												</div>
											)}
											
											<div>
												<label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Account Name *</label>
												<input 
													value={newPaymentData.accountName} 
													onChange={(e) => setNewPaymentData(prev => ({ ...prev, accountName: e.target.value }))} 
													className="w-full h-11 sm:h-[50px] rounded-lg border border-[#e5e5e5] px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all" 
													placeholder="Your name"
												/>
											</div>
											
											<div>
												<label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Account Number *</label>
												<input 
													value={newPaymentData.accountNumber} 
													onChange={(e) => setNewPaymentData(prev => ({ ...prev, accountNumber: e.target.value }))} 
													className="w-full h-11 sm:h-[50px] rounded-lg border border-[#e5e5e5] px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all" 
													placeholder="03001234567"
												/>
											</div>
											
											<div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
												<button 
													onClick={() => {
														setSelectedBankType(null)
														setShowBankList(false)
														setIsEditing(false)
														setEditingIndex(null)
														setNewPaymentData({ bankName: '', accountName: '', accountNumber: '' })
													}}
													className="flex-1 h-11 sm:h-[50px] rounded-lg border border-slate-300 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
													disabled={submitting}
												>
													Cancel
												</button>
												<button 
													onClick={savePaymentMethod}
													className="flex-1 h-11 sm:h-[50px] rounded-lg bg-brand-accent px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
													disabled={submitting}
												>
													{submitting ? (isEditing || editingIndex !== null ? 'Updating...' : 'Saving...') : (isEditing || editingIndex !== null ? 'Update' : 'Save')}
												</button>
											</div>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

