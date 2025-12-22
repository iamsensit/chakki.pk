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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
	try {
		await connectToDatabase()
		const session = await auth()
		
		if (!session) {
			return json(false, 'Unauthorized - Please log in', undefined, undefined, 401)
		}
		
		// Check if admin
		if (!(await isAdminAsync(session))) {
			return json(false, 'Unauthorized - Admin access required', undefined, undefined, 403)
		}
		
		// Handle both Promise and direct params (Next.js 14/15 compatibility)
		const resolvedParams = params instanceof Promise ? await params : params
		const id = resolvedParams.id
		
		if (!id) {
			return json(false, 'Order ID is required', undefined, undefined, 400)
		}
		
		const order = await Order.findById(id).lean()
		if (!order || Array.isArray(order)) {
			return json(false, 'Order not found', undefined, undefined, 404)
		}
		
		const userEmail = order.userId
		if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
			return json(false, 'Invalid user email', undefined, undefined, 400)
		}
		
		// Enrich order items with product details
		const enrichedItems = await enrichOrderItems(order.items)
		const orderForEmail = {
			_id: String(order._id),
			status: order.status || 'PENDING',
			paymentMethod: order.paymentMethod || 'COD',
			totalAmount: order.totalAmount || 0,
			deliveryFee: order.deliveryFee || 0,
			deliveryType: order.deliveryType || 'STANDARD',
			shippingName: order.shippingName || '',
			shippingPhone: order.shippingPhone || '',
			shippingAddress: order.shippingAddress || '',
			city: order.city || '',
			paymentReference: order.paymentReference,
			items: enrichedItems,
			createdAt: order.createdAt ? (typeof order.createdAt === 'string' ? order.createdAt : order.createdAt.toISOString()) : new Date().toISOString(),
			updatedAt: order.updatedAt ? (typeof order.updatedAt === 'string' ? order.updatedAt : order.updatedAt.toISOString()) : undefined
		}
		
		// Create comprehensive email template
		const deliveryTypeText = order.deliveryType === 'EXPRESS' ? 'Express Delivery' : 'Standard Delivery'
		const deliveryTimeText = order.deliveryType === 'EXPRESS' ? '1-2 days' : '3-5 days'
		
		const html = renderOrderEmailTemplate(
			orderForEmail,
			'Order Details',
			`Here are the complete details of your order. Delivery Type: ${deliveryTypeText} (${deliveryTimeText}).`,
			'placed'
		)
		
		const text = `Order Details - Order ${order._id}\n\n` +
			`Order Status: ${order.status || 'PENDING'}\n` +
			`Payment Method: ${order.paymentMethod || 'COD'}\n` +
			`Delivery Type: ${deliveryTypeText} (${deliveryTimeText})\n` +
			`Delivery Fee: ${formatPKR(order.deliveryFee || 0)}\n` +
			`Total Amount: ${formatPKR(order.totalAmount || 0)}\n\n` +
			`Shipping Address:\n${order.shippingAddress || ''}, ${order.city || ''}\n\n` +
			`Thank you for your order!`
		
		const emailResult = await sendEmail({ 
			to: userEmail, 
			subject: `Order Details - Order ${order._id}`,
			text,
			html
		})
		
		if (!emailResult.success && !emailResult.skipped) {
			return json(false, 'Failed to send email', undefined, undefined, 500)
		}
		
		return json(true, 'Order details email sent', { emailSent: emailResult.success })
	} catch (err: any) {
		console.error('POST /api/orders/:id/send-details error', err)
		return json(false, err.message || 'Failed to send email', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

