"use client"

import { X, AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

interface ErrorDialogProps {
	open: boolean
	message: string
	onClose: () => void
	title?: string
}

export default function ErrorDialog({ open, message, onClose, title = 'Error' }: ErrorDialogProps) {
	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		return () => {
			document.body.style.overflow = ''
		}
	}, [open])

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<div 
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>
			
			{/* Dialog */}
			<div className="relative bg-white  shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
				{/* Close button */}
				<button
					onClick={(e) => {
						e.stopPropagation()
						onClose()
					}}
					className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
					aria-label="Close"
				>
					<X className="h-5 w-5" />
				</button>

				{/* Content */}
				<div className="flex items-start gap-4">
					{/* Icon */}
					<div className="flex-shrink-0">
						<div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
							<AlertCircle className="h-5 w-5 text-red-600" />
						</div>
					</div>

					{/* Text */}
					<div className="flex-1 pt-0.5">
						<h3 className="text-lg font-semibold text-gray-900 mb-1">
							{title}
						</h3>
						<p className="text-sm text-gray-600 leading-relaxed">
							{message}
						</p>
					</div>
				</div>

				{/* Action button */}
				<div className="mt-6 flex justify-end">
					<button
						onClick={(e) => {
							e.stopPropagation()
							onClose()
						}}
						className="px-4 py-2 bg-brand-accent hover:bg-brand text-white text-sm font-medium  transition-colors"
					>
						OK
					</button>
				</div>
			</div>
		</div>
	)
}

