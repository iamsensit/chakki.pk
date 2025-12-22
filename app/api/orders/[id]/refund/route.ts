import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Order from '@/models/Order'
import { auth } from '@/app/lib/auth'
import { isAdminAsync } from '@/app/lib/roles'
import { sendEmail } from '@/app/lib/email'
import { renderEmailTemplate } from '@/app/lib/email'
import { formatCurrencyPKR } from '@/app/lib/price'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

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
		
		const body = await req.json()
		const { refundMethod, refundAccountNumber } = body
		
		if (!refundMethod) {
			return json(false, 'Refund method is required', undefined, undefined, 400)
		}
		
		const order = await Order.findById(id)
		if (!order || Array.isArray(order)) {
			return json(false, 'Order not found', undefined, undefined, 404)
		}
		
		if (order.status !== 'CANCELLED') {
			return json(false, 'Only cancelled orders can be refunded', undefined, undefined, 400)
		}
		
		if (order.refunded) {
			return json(false, 'Order has already been refunded', undefined, undefined, 400)
		}
		
		// Get user email from order
		const userEmail = order.userId
		if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
			return json(false, 'Invalid user email in order', undefined, undefined, 400)
		}
		
		// Update order with refund information
		order.refunded = true
		order.refundedAt = new Date()
		order.refundAmount = order.totalAmount || 0
		order.refundMethod = refundMethod
		order.refundAccountNumber = refundAccountNumber || ''
		await order.save()
		
		// Send refund confirmation email
		try {
			const refundMethodLabel = refundMethod === 'JAZZCASH' ? 'JazzCash' : 
									  refundMethod === 'EASYPAISA' ? 'EasyPaisa' : 
									  refundMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : refundMethod
			
			const emailHtml = renderEmailTemplate({
				title: 'Refund Processed',
				intro: 'Your refund has been processed successfully.',
				body: `
					<p>We have processed the refund for your cancelled order <strong>#${String(order._id).slice(-8).toUpperCase()}</strong>.</p>
					<p><strong>Refund Details:</strong></p>
					<ul>
						<li><strong>Refund Amount:</strong> ${formatCurrencyPKR(order.totalAmount || 0)}</li>
						<li><strong>Refund Method:</strong> ${refundMethodLabel}</li>
						${refundAccountNumber ? `<li><strong>Account Number:</strong> ${refundAccountNumber}</li>` : ''}
						<li><strong>Refund Date:</strong> ${new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
					</ul>
					<p>The refund amount will be transferred to your account within 3-5 business days.</p>
					<p>If you have any questions or concerns, please contact our support team.</p>
				`,
				footer: 'Thank you for your patience. We apologize for any inconvenience caused.'
			})
			
			await sendEmail({
				to: userEmail,
				subject: `Refund Processed - Order #${String(order._id).slice(-8).toUpperCase()}`,
				html: emailHtml
			})
		} catch (emailError: any) {
			// Log email error but don't fail the refund
			console.error('[REFUND] Failed to send refund email:', emailError)
		}
		
		return json(true, 'Refund processed successfully and email sent to customer', {
			refunded: true,
			refundAmount: order.refundAmount,
			refundMethod: order.refundMethod
		})
	} catch (err: any) {
		console.error('POST /api/orders/:id/refund error', err)
		return json(false, err.message || 'Failed to process refund', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

