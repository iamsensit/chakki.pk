import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit } from './app/lib/security'

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
		request.headers.get('x-real-ip') ||
		'127.0.0.1'

	// 1. Rate Limiting for API Routes
	if (pathname.startsWith('/api/')) {
		let maxReqs = 120
		let windowMs = 60000 // 1 minute

		if (pathname.startsWith('/api/auth/')) {
			maxReqs = 15 // Stricter for auth / password reset / signup
		} else if (pathname.startsWith('/api/orders')) {
			maxReqs = 30 // Moderate for order placement & tracking
		} else if (pathname.startsWith('/api/payments/')) {
			maxReqs = 20
		} else if (pathname.startsWith('/api/admin/')) {
			maxReqs = 60
		}

		const rateLimit = checkRateLimit(`${ip}:${pathname.split('/')[2] || 'api'}`, maxReqs, windowMs)

		if (!rateLimit.success) {
			return new NextResponse(
				JSON.stringify({
					success: false,
					message: 'Too many requests. Please slow down and try again later.',
					error: 'RATE_LIMIT_EXCEEDED'
				}),
				{
					status: 429,
					headers: {
						'Content-Type': 'application/json',
						'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
						'X-RateLimit-Limit': String(rateLimit.limit),
						'X-RateLimit-Remaining': String(rateLimit.remaining),
						'X-RateLimit-Reset': String(rateLimit.reset)
					}
				}
			)
		}
	}

	// 2. Prepare Response & Inject Security Headers
	const response = NextResponse.next()

	// Content Security Policy
	const cspHeader = `
		default-src 'self';
		script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://*.google.com https://*.gstatic.com;
		style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
		img-src 'self' blob: data: https://* http://*;
		font-src 'self' data: https://fonts.gstatic.com;
		connect-src 'self' https://maps.googleapis.com https://*.google.com https://*.cloudinary.com;
		frame-src 'self' https://*.google.com;
		object-src 'none';
		base-uri 'self';
		form-action 'self';
		frame-ancestors 'none';
		upgrade-insecure-requests;
	`.replace(/\s{2,}/g, ' ').trim()

	response.headers.set('Content-Security-Policy', cspHeader)
	response.headers.set('X-Frame-Options', 'DENY')
	response.headers.set('X-Content-Type-Options', 'nosniff')
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
	response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

	return response
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder files (images, icons, etc.)
		 */
		'/((?!_next/static|_next/image|favicon.ico|images|logo.png|manifest.json).*)',
	],
}
