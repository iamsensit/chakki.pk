"use client"

import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<SessionProvider>
			<SWRConfig
				value={{
					fetcher,
					revalidateOnFocus: false,
					revalidateOnReconnect: true,
					dedupingInterval: 5000, // Dedupe requests within 5 seconds
					refreshInterval: 0, // Don't auto-refresh
				}}
			>
				{children}
			</SWRConfig>
		</SessionProvider>
	)
}
