/**
 * Security Utilities for Chakki.pk
 * Provides XSS sanitization, PII masking, rate limiting, and secure token generation.
 */

// Simple, robust HTML sanitizer for rendering rich text safely without DOMPurify node dependency
export function sanitizeHtml(rawHtml: string): string {
	if (!rawHtml || typeof rawHtml !== 'string') return ''

	// Strip script tags and their contents
	let sanitized = rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

	// Strip iframe, embed, object tags
	sanitized = sanitized.replace(/<(iframe|embed|object|base|link|meta)\b[^>]*>/gi, '')
	sanitized = sanitized.replace(/<\/(iframe|embed|object|base|link|meta)>/gi, '')

	// Strip inline event handlers (e.g. onload=, onclick=, onerror=, onmouseover=)
	sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '')

	// Strip javascript: pseudo-protocol in href or src
	sanitized = sanitized.replace(/(href|src)\s*=\s*(['"]\s*javascript:[^'"]*['"]|javascript:[^\s>]+)/gi, '$1="#"')

	// Strip data: URIs in src (except safe images if needed)
	sanitized = sanitized.replace(/src\s*=\s*['"]\s*data:(?!image\/(png|jpeg|jpg|webp|gif|svg\+xml))[^'"]*['"]/gi, 'src=""')

	return sanitized
}

// Mask Phone Number (e.g., 03001234567 -> 0300****567)
export function maskPhoneNumber(phone?: string): string {
	if (!phone || typeof phone !== 'string') return ''
	const clean = phone.trim()
	if (clean.length <= 6) return '****'
	const start = clean.slice(0, 4)
	const end = clean.slice(-3)
	return `${start}****${end}`
}

// Mask Email (e.g., customer@gmail.com -> c***r@gmail.com)
export function maskEmail(email?: string): string {
	if (!email || typeof email !== 'string') return ''
	const [name, domain] = email.split('@')
	if (!domain) return '***@***'
	if (name.length <= 2) return `${name[0]}*@${domain}`
	const first = name[0]
	const last = name[name.length - 1]
	return `${first}${'*'.repeat(Math.max(1, name.length - 2))}${last}@${domain}`
}

// Mask Street Address (e.g., "House 12-A, Street 4, Model Town, Lahore" -> "Model Town, Lahore")
export function maskAddress(address?: string, city?: string): string {
	if (!address || typeof address !== 'string') return city || 'Lahore'
	const parts = address.split(',').map(p => p.trim())
	if (parts.length > 2) {
		return parts.slice(-2).join(', ')
	}
	return city ? `${city}, Pakistan` : address
}

// In-memory token bucket rate limiter for Next.js Edge / Node middleware
interface RateLimitEntry {
	count: number
	resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Periodic cleanup of expired rate limit entries
if (typeof setInterval !== 'undefined') {
	setInterval(() => {
		const now = Date.now()
		for (const [key, entry] of rateLimitStore.entries()) {
			if (entry.resetAt <= now) {
				rateLimitStore.delete(key)
			}
		}
	}, 60000)
}

export function checkRateLimit(
	identifier: string,
	maxRequests = 60,
	windowMs = 60000
): { success: boolean; limit: number; remaining: number; reset: number } {
	const now = Date.now()
	const entry = rateLimitStore.get(identifier)

	if (!entry || entry.resetAt <= now) {
		rateLimitStore.set(identifier, {
			count: 1,
			resetAt: now + windowMs
		})
		return {
			success: true,
			limit: maxRequests,
			remaining: maxRequests - 1,
			reset: now + windowMs
		}
	}

	if (entry.count >= maxRequests) {
		return {
			success: false,
			limit: maxRequests,
			remaining: 0,
			reset: entry.resetAt
		}
	}

	entry.count += 1
	return {
		success: true,
		limit: maxRequests,
		remaining: maxRequests - entry.count,
		reset: entry.resetAt
	}
}
