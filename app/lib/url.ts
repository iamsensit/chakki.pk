import { headers } from 'next/headers'

export function getBaseUrl() {
	const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL
	if (envBase) return envBase.replace(/\/$/, '')
	const h = headers()
	const host = h.get('host') || 'localhost:3000'
	const proto = h.get('x-forwarded-proto') || 'http'
	return `${proto}://${host}`
}
