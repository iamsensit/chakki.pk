"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { Package } from 'lucide-react'

export default function OutOfStockRequestButton({ 
	productId, 
	productTitle, 
	variantId, 
	variantLabel 
}: { 
	productId: string
	productTitle: string
	variantId?: string
	variantLabel?: string
}) {
	const [requesting, setRequesting] = useState(false)
	const { data: session } = useSession()

	async function handleRequest() {
		setRequesting(true)
		try {
			const res = await fetch('/api/requests', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'out_of_stock',
					productId,
					productTitle,
					variantId,
					variantLabel,
					email: session?.user?.email || '',
					name: session?.user?.name || 'Guest User',
				}),
			})

			const json = await res.json()
			if (json.success) {
				toast.success('Request submitted! We will restock this product soon.')
			} else {
				toast.error(json.message || 'Failed to submit request')
			}
		} catch (error) {
			console.error('Request error:', error)
			toast.error('Failed to submit request')
		} finally {
			setRequesting(false)
		}
	}

	return (
		<button
			onClick={handleRequest}
			disabled={requesting}
			className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-brand-accent hover:bg-brand disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium transition-colors"
		>
			<Package className="h-3 w-3 sm:h-4 sm:w-4" />
			{requesting ? 'Submitting...' : 'Request This Product to Be Restocked'}
		</button>
	)
}


