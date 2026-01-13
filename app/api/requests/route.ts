import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import Request from '@/models/Request'
import { connectToDatabase } from '@/app/lib/mongodb'

function json(success: boolean, message: string, data?: any, status = 200) {
	return NextResponse.json({ success, message, data }, { status })
}

// GET - Fetch requests (admin only)
export async function GET(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		
		if (!session?.user?.email) {
			return json(false, 'Unauthorized', undefined, 401)
		}
		
		// Check if user is admin
		const User = (await import('@/models/User')).default
		const user = await User.findOne({ email: session.user.email }).lean()
		if (!user || Array.isArray(user)) {
			return json(false, 'Admin access required', undefined, 403)
		}
		const userRole = (user as any)?.role
		if (userRole !== 'ADMIN' && userRole !== 'admin') {
			return json(false, 'Admin access required', undefined, 403)
		}
		
		const { searchParams } = new URL(req.url)
		const type = searchParams.get('type') // 'delivery_area' or 'out_of_stock'
		const status = searchParams.get('status') // 'pending', 'approved', 'rejected'
		
		const query: any = {}
		if (type) query.type = type
		if (status) query.status = status
		
		const requests = await Request.find(query)
			.sort({ createdAt: -1 })
			.populate('productId', 'title images')
			.lean()
		
		return json(true, 'Requests fetched', { requests })
	} catch (err: any) {
		console.error('GET /api/requests error:', err)
		return json(false, 'Failed to fetch requests', undefined, 500)
	}
}

// POST - Create a new request
export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		
		const body = await req.json()
		const { type, address, city, latitude, longitude, productId, productTitle, variantId, variantLabel, notes } = body
		
		if (!type || (type !== 'delivery_area' && type !== 'out_of_stock')) {
			return json(false, 'Invalid request type', undefined, 400)
		}
		
		if (type === 'delivery_area') {
			if (!address || !city || latitude === undefined || longitude === undefined) {
				return json(false, 'Missing required fields for delivery area request', undefined, 400)
			}
		} else if (type === 'out_of_stock') {
			if (!productId || !productTitle) {
				return json(false, 'Missing required fields for out of stock request', undefined, 400)
			}
		}
		
		const userEmail = session?.user?.email || body.email || 'guest'
		const userName = session?.user?.name || body.name || 'Guest User'
		
		const request = await Request.create({
			type,
			userEmail,
			userName,
			status: 'pending',
			address: type === 'delivery_area' ? address : undefined,
			city: type === 'delivery_area' ? city : undefined,
			latitude: type === 'delivery_area' ? latitude : undefined,
			longitude: type === 'delivery_area' ? longitude : undefined,
			productId: type === 'out_of_stock' ? productId : undefined,
			productTitle: type === 'out_of_stock' ? productTitle : undefined,
			variantId: type === 'out_of_stock' ? variantId : undefined,
			variantLabel: type === 'out_of_stock' ? variantLabel : undefined,
			notes,
		})
		
		return json(true, 'Request submitted successfully', { request })
	} catch (err: any) {
		console.error('POST /api/requests error:', err)
		return json(false, 'Failed to submit request', undefined, 500)
	}
}

export const dynamic = 'force-dynamic'

