import { headers } from 'next/headers'

// Cache base URL to avoid calling headers() repeatedly
let cachedBaseUrl: string | null = null

export function getBaseUrl() {
	// Use environment variable first (fastest, no headers() call needed)
	const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL
	if (envBase) {
		cachedBaseUrl = envBase.replace(/\/$/, '')
		return cachedBaseUrl
	}
	
	// Use cached value if available (for server components)
	if (cachedBaseUrl) {
		return cachedBaseUrl
	}
	
	// Fallback to headers() only when necessary (slower)
	try {
		const h = headers()
		const host = h.get('host') || 'localhost:3000'
		const proto = h.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
		cachedBaseUrl = `${proto}://${host}`
		return cachedBaseUrl
	} catch {
		// If headers() fails, return default
		return process.env.NODE_ENV === 'production' ? 'https://chakki.pk' : 'http://localhost:3000'
	}
}
