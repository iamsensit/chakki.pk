import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Order from '@/models/Order'
import { auth } from '@/app/lib/auth'
import { isAdminAsync } from '@/app/lib/roles'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
	try {
		await connectToDatabase()
		
		// Handle both Promise and direct params (Next.js 14/15 compatibility)
		const resolvedParams = params instanceof Promise ? await params : params
		const id = resolvedParams.id
		
		if (!id) {
			return json(false, 'Order ID is required', undefined, undefined, 400)
		}
		
		// Allow public access to fetch orders by ID for tracking
		const order = await Order.findById(id).lean()
		if (!order || Array.isArray(order)) {
			return json(false, 'Order not found', undefined, undefined, 404)
		}
		
		return json(true, 'Order fetched', order)
	} catch (err: any) {
		console.error('GET /api/orders/:id error', err)
		return json(false, err.message || 'Failed to fetch order', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
	try {
		await connectToDatabase()
		const session = await auth()
		
		if (!session) {
			return json(false, 'Unauthorized - Please log in', undefined, undefined, 401)
		}
		
		// Check if admin (checks both ADMIN_EMAILS env and database role)
		if (!(await isAdminAsync(session))) {
			console.error('PUT /api/orders/:id - Admin check failed for:', session.user?.email)
			return json(false, 'Unauthorized - Admin access required', undefined, undefined, 403)
		}
		
		// Handle both Promise and direct params (Next.js 14/15 compatibility)
		const resolvedParams = params instanceof Promise ? await params : params
		const id = resolvedParams.id
		
		if (!id) {
			return json(false, 'Order ID is required', undefined, undefined, 400)
		}
		
		const body = await req.json()
		const { paymentStatus, status } = body || {}
		
		const update: any = {}
		if (paymentStatus) update.paymentStatus = paymentStatus
		if (status) update.status = status
		
		if (Object.keys(update).length === 0) {
			return json(false, 'No fields to update', undefined, undefined, 400)
		}
		
		const updated = await Order.findByIdAndUpdate(id, { $set: update }, { new: true }).lean()
		
		if (!updated || Array.isArray(updated)) {
			return json(false, 'Order not found', undefined, undefined, 404)
		}
		
		return json(true, 'Order updated', updated)
	} catch (err: any) {
		console.error('PUT /api/orders/:id error', err)
		return json(false, err.message || 'Failed to update order', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'
