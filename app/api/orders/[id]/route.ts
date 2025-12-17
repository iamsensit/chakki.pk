import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Order from '@/models/Order'
import { auth } from '@/app/lib/auth'
import { isAdminAsync } from '@/app/lib/roles'
import { sendEmail } from '@/app/lib/email'
import { renderOrderEmailTemplate, enrichOrderItems } from '@/app/lib/email-templates'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

const formatPKR = (amount: number) => `Rs ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

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
		
		const hasUpdate = Boolean(paymentStatus || status)
		if (!hasUpdate) {
			return json(false, 'No fields to update', undefined, undefined, 400)
		}
		
		const order = await Order.findById(id)
		if (!order) {
			return json(false, 'Order not found', undefined, undefined, 404)
		}
		
		const prevPaymentStatus = order.paymentStatus
		const prevStatus = order.status
		
		if (paymentStatus) order.paymentStatus = paymentStatus
		if (status) order.status = status
		
		await order.save()

		// Get user email from userId (userId is stored as email in this system)
		const userEmail = order.userId
		if (userEmail && typeof userEmail === 'string' && userEmail.includes('@')) {
			// Send emails asynchronously (best-effort, don't block response)
			setImmediate(async () => {
				try {
					console.log('[ORDER UPDATE] Preparing to send email to:', userEmail, 'for order:', order._id, 'status:', status, 'paymentStatus:', paymentStatus)
					
					const enrichedItems = await enrichOrderItems(order.items)
					const orderForEmail = {
						...order.toObject(),
						items: enrichedItems
					}

					if (paymentStatus && paymentStatus !== prevPaymentStatus && paymentStatus === 'PAID') {
						const html = renderOrderEmailTemplate(
							orderForEmail,
							'Payment Confirmed!',
							'Great news! Your payment has been confirmed and your order is being processed.',
							'payment'
						)
						const text = `Payment Confirmed!\n\nYour payment for order ${order._id} has been confirmed.\n\nTotal: ${formatPKR(order.totalAmount)}\n\nThank you for your order!`
						
						const emailResult = await sendEmail({ 
							to: userEmail, 
							subject: `Payment Confirmed - Order ${order._id}`,
							text,
							html
						})
						console.log('[ORDER UPDATE] Payment confirmation email result:', emailResult)
						
						if (!emailResult.success && !emailResult.skipped) {
							console.error('[ORDER UPDATE] Payment email failed:', emailResult.error)
						}
					}

					if (status && status !== prevStatus) {
						let title = ''
						let message = ''
						let type: 'confirmed' | 'shipped' | 'delivered' = 'confirmed'
						
						if (status === 'CONFIRMED') {
							title = 'Order Confirmed!'
							message = 'Your order has been confirmed and is being prepared for shipment.'
							type = 'confirmed'
						} else if (status === 'SHIPPED') {
							title = 'Order Shipped!'
							message = 'Your order has been shipped and is on its way to you. You can track it using the order details below.'
							type = 'shipped'
						} else if (status === 'DELIVERED') {
							title = 'Order Delivered!'
							message = 'Your order has been delivered! We hope you enjoy your purchase. Thank you for shopping with Chakki!'
							type = 'delivered'
						} else {
							title = `Order ${status}`
							message = `Your order status has been updated to ${status}.`
						}
						
						const html = renderOrderEmailTemplate(orderForEmail, title, message, type)
						const text = `${title}\n\n${message}\n\nOrder ID: ${order._id}\nTotal: ${formatPKR(order.totalAmount)}\n\nThank you for shopping with Chakki!`
						
						const emailResult = await sendEmail({ 
							to: userEmail, 
							subject: `${title} - Order ${order._id}`,
							text,
							html
						})
						console.log('[ORDER UPDATE] Status update email result:', emailResult)
						
						if (!emailResult.success && !emailResult.skipped) {
							console.error('[ORDER UPDATE] Status email failed:', emailResult.error)
						} else if (emailResult.skipped) {
							console.warn('[ORDER UPDATE] Email skipped - SMTP not configured')
						}
					}
				} catch (err: any) {
					console.error('[ORDER UPDATE] Email error:', err?.message || err)
				}
			})
		} else {
			console.warn('[ORDER UPDATE] No valid userEmail found for order:', order._id, 'userId:', order.userId)
		}
		
		return json(true, 'Order updated', order.toObject())
	} catch (err: any) {
		console.error('PUT /api/orders/:id error', err)
		return json(false, err.message || 'Failed to update order', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'
