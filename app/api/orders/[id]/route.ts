import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Order from '@/models/Order'
import { auth } from '@/app/lib/auth'
import { isAdminAsync } from '@/app/lib/roles'
import { sendEmail } from '@/app/lib/email'
import { renderOrderEmailTemplate, enrichOrderItems } from '@/app/lib/email-templates'
import { maskPhoneNumber, maskAddress, maskEmail } from '@/app/lib/security'
import mongoose from 'mongoose'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
	try {
		await connectToDatabase()
		
		const resolvedParams = params instanceof Promise ? await params : params
		const id = resolvedParams?.id?.trim()
		
		if (!id) {
			return json(false, 'Order ID is required', undefined, undefined, 400)
		}

		// Validate MongoDB ObjectId or return 404 cleanly
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return json(false, 'Invalid Order ID format', undefined, undefined, 404)
		}
		
		const order = await Order.findById(id).lean()
		if (!order || Array.isArray(order)) {
			return json(false, 'Order not found', undefined, undefined, 404)
		}

		const session = await auth()
		const userEmail = session?.user?.email
		const isOwner = userEmail && order.userId && order.userId.toLowerCase() === userEmail.toLowerCase()
		const isAdmin = session ? await isAdminAsync(session) : false
		
		// Enrich order items with product names
		const { enrichOrderItems } = await import('@/app/lib/email-templates')
		const enrichedItems = await enrichOrderItems(order.items || [])
		
		let responseData: any = {
			...order,
			items: enrichedItems
		}

		// Mask PII if requester is not authenticated as owner or admin
		if (!isOwner && !isAdmin) {
			responseData = {
				...responseData,
				userId: maskEmail(order.userId),
				shippingPhone: maskPhoneNumber(order.shippingPhone),
				shippingAddress: maskAddress(order.shippingAddress, order.city),
				paymentReference: order.paymentReference ? maskPhoneNumber(order.paymentReference) : undefined,
				isMasked: true
			}
		}
		
		return json(true, 'Order fetched', responseData)
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
		
		if (!(await isAdminAsync(session))) {
			return json(false, 'Unauthorized - Admin access required', undefined, undefined, 403)
		}
		
		const resolvedParams = params instanceof Promise ? await params : params
		const id = resolvedParams?.id?.trim()
		
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			return json(false, 'Valid Order ID is required', undefined, undefined, 400)
		}
		
		const body = await req.json().catch(() => ({}))
		let { status, cancellationReason, cancellationReasonType, cancellationEmailSubject, shippedAt } = body || {}
		
		if (!status) {
			return json(false, 'Status is required', undefined, undefined, 400)
		}
		
		const order = await Order.findById(id)
		if (!order) {
			return json(false, 'Order not found', undefined, undefined, 404)
		}
		
		const prevStatus = order.status
		
		if (status) {
			order.status = status
			if (status === 'SHIPPED' && !order.shippedAt) {
				order.shippedAt = shippedAt ? new Date(shippedAt) : new Date()
			}
			if (status === 'DELIVERED' && !order.deliveredAt) {
				order.deliveredAt = new Date()
			}
			if (status === 'CANCELLED' && !order.cancelledAt) {
				order.cancelledAt = new Date()
				if (cancellationReason) {
					order.cancellationReason = cancellationReason
				}
			}
			await order.save()
		}

		// Send email notifications on status changes
		if (status !== prevStatus && order.userId) {
			;(async () => {
				try {
					const enrichedItems = await enrichOrderItems(order.items)
					const orderForEmail = { ...order.toObject(), items: enrichedItems }
					let subject = `Order Update - #${order._id}`
					let title = `Order Status: ${status}`
					let message = `Your order status has been updated to ${status}.`

					if (status === 'SHIPPED') {
						title = 'Your Order is on the Way!'
						message = 'Your fresh chakki groceries have been dispatched and will arrive shortly.'
					} else if (status === 'DELIVERED') {
						title = 'Order Delivered!'
						message = 'Your order has been delivered. Thank you for shopping with Chakki.pk!'
					}

					const html = renderOrderEmailTemplate(orderForEmail, title, message, status.toLowerCase() as any)
					await sendEmail({ to: order.userId, subject, html })
				} catch (emailErr) {
					console.error('Failed to send status update email', emailErr)
				}
			})()
		}
		
		return json(true, 'Order updated', order)
	} catch (err: any) {
		console.error('PUT /api/orders/:id error', err)
		return json(false, err.message || 'Failed to update order', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'
