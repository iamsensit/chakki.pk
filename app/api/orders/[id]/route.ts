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
		
		// Enrich order items with product names
		const { enrichOrderItems } = await import('@/app/lib/email-templates')
		const enrichedItems = await enrichOrderItems(order.items || [])
		const enrichedOrder = {
			...order,
			items: enrichedItems
		}
		
		return json(true, 'Order fetched', enrichedOrder)
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
		let { status, cancellationReason, cancellationReasonType, cancellationEmailSubject, shippedAt } = body || {}
		
		// Only update status, no payment status handling
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
			// Set timestamps based on status
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
		}
		
		await order.save()

		// Get user email from userId (userId is stored as email in this system)
		const userEmail = order.userId
		if (userEmail && typeof userEmail === 'string' && userEmail.includes('@')) {
			// Send emails asynchronously (best-effort, don't block response)
			setImmediate(async () => {
				try {
					console.log('[ORDER UPDATE] Preparing to send email to:', userEmail, 'for order:', order._id, 'status:', status)
					
					const enrichedItems = await enrichOrderItems(order.items)
					const orderForEmail = {
						...order.toObject(),
						items: enrichedItems
					}

					if (status && status !== prevStatus) {
						let title = ''
						let message = ''
						let type: 'confirmed' | 'shipped' | 'delivered' = 'confirmed'
						
						if (status === 'CONFIRMED') {
							// Order confirmed email with delivery info
							const deliveryType = order.deliveryType || 'STANDARD'
							const deliveryTime = deliveryType === 'EXPRESS' 
								? '1-2 days' 
								: '3-5 days'
							const deliveryMethod = deliveryType === 'EXPRESS' ? 'Express Delivery' : 'Standard Delivery'
							
							title = 'Order Confirmed!'
							message = `Great news! Your order has been confirmed and we're preparing it for shipment.\n\nDelivery Method: ${deliveryMethod}\nExpected Delivery: ${deliveryTime}\n\nYour order will be delivered to:\n${order.shippingAddress}, ${order.city}`
							type = 'confirmed'
							
							// Send comprehensive email with all details
							const orderForEmailWithStatus = {
								...orderForEmail,
								status: 'CONFIRMED'
							}
							const html = renderOrderEmailTemplate(
								orderForEmailWithStatus,
								title,
								message,
								'confirmed',
								deliveryType,
								deliveryTime
							)
							const text = `${title}\n\n${message}\n\nOrder ID: ${order._id}\nTotal: ${formatPKR(order.totalAmount)}\nOrder Status: CONFIRMED\n\nThank you for shopping with Chakki!`
							
							const emailResult = await sendEmail({ 
								to: userEmail, 
								subject: `Order Confirmed - Order ${order._id}`,
								text,
								html
							})
							console.log('[ORDER UPDATE] Confirmation email result:', emailResult)
							
							if (!emailResult.success && !emailResult.skipped) {
								console.error('[ORDER UPDATE] Confirmation email failed:', emailResult.error)
							} else if (emailResult.skipped) {
								console.warn('[ORDER UPDATE] Email skipped - SMTP not configured')
							}
							
							// Skip the default email sending below for CONFIRMED status
							return // Exit early from setImmediate callback to prevent duplicate email
						} else if (status === 'SHIPPED') {
							title = 'Order Shipped!'
							message = 'Your order has been shipped and is on its way to you. You can track it using the order details below.'
							type = 'shipped'
						} else if (status === 'DELIVERED') {
							title = 'Order Delivered!'
							message = 'Your order has been delivered! We hope you enjoy your purchase. Thank you for shopping with Chakki!'
							type = 'delivered'
						} else if (status === 'CANCELLED') {
							// Use custom email subject if provided
							const emailSubject = cancellationEmailSubject || 'Order Cancelled'
							
							// Customize message based on cancellation reason type
							let message = `Your order has been cancelled.`
							if (cancellationReasonType === 'not_paid' || cancellationReasonType === 'not_received') {
								message = `Your order has been cancelled because payment was not received or verified. If you have already made the payment, please contact us with your payment reference number.`
							} else if (cancellationReasonType === 'customer_request') {
								message = `Your order has been cancelled as per your request. If you need any assistance, please contact us.`
							} else if (cancellationReasonType === 'out_of_stock') {
								message = `Your order has been cancelled because one or more items are currently out of stock. We apologize for the inconvenience.`
							} else if (cancellationReasonType === 'invalid_address') {
								message = `Your order has been cancelled due to an invalid or undeliverable address. Please update your delivery address and place a new order.`
							} else if (order.cancellationReason) {
								message = `Your order has been cancelled. Reason: ${order.cancellationReason}`
							}
							message += ` If you have any questions, please contact us.`
							
							title = emailSubject
							type = 'confirmed' // Use confirmed template for cancelled orders
						} else {
							title = `Order ${status}`
							message = `Your order status has been updated to ${status}.`
						}
						
						const html = renderOrderEmailTemplate(orderForEmail, title, message, type)
						const text = `${title}\n\n${message}\n\nOrder ID: ${order._id}\nTotal: ${formatPKR(order.totalAmount)}\n\nThank you for shopping with Chakki!`
						
						// Use custom email subject for cancellations, otherwise use default
						const finalSubject = status === 'CANCELLED' && cancellationEmailSubject 
							? `${cancellationEmailSubject} - Order ${order._id}`
							: `${title} - Order ${order._id}`
						
						const emailResult = await sendEmail({ 
							to: userEmail, 
							subject: finalSubject,
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
