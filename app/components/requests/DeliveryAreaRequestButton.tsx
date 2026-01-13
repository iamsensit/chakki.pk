"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { MapPin } from 'lucide-react'

export default function DeliveryAreaRequestButton({ 
	address, 
	city, 
	latitude, 
	longitude 
}: { 
	address: string
	city: string
	latitude?: number
	longitude?: number
}) {
	const [requesting, setRequesting] = useState(false)
	const { data: session } = useSession()

	async function handleRequest() {
		if (!address || !city || latitude === undefined || longitude === undefined) {
			toast.error('Please select a location first')
			return
		}

		setRequesting(true)
		try {
			const res = await fetch('/api/requests', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'delivery_area',
					address,
					city,
					latitude,
					longitude,
					email: session?.user?.email || '',
					name: session?.user?.name || 'Guest User',
				}),
			})

			const json = await res.json()
			if (json.success) {
				toast.success('Request submitted! We will review your area and add it if possible.')
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
			disabled={requesting || !address || !city || latitude === undefined || longitude === undefined}
			className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium transition-colors"
		>
			<MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
			{requesting ? 'Submitting...' : 'Request This Area to Be Added'}
		</button>
	)
}


