import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Order from '@/models/Order'
import { auth } from '@/app/lib/auth'
import { isAdminAsync } from '@/app/lib/roles'
import { sendEmail } from '@/app/lib/email'

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
		
		// Only send reminder for JazzCash/EasyPaisa orders with pending payment
		if ((order.paymentMethod !== 'JAZZCASH' && order.paymentMethod !== 'EASYPAISA') || order.paymentStatus !== 'PENDING') {
			return json(false, 'Payment reminder can only be sent for unpaid JazzCash/EasyPaisa orders', undefined, undefined, 400)
		}
		
		const userEmail = order.userId
		if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
			return json(false, 'Invalid user email', undefined, undefined, 400)
		}
		
		const paymentMethodName = order.paymentMethod === 'JAZZCASH' ? 'JazzCash' : 'EasyPaisa'
		const accountNumber = order.paymentMethod === 'JAZZCASH' ? order.jazzcashAccountNumber : order.easypaisaAccountNumber
		const accountName = order.paymentMethod === 'JAZZCASH' ? order.jazzcashAccountName : order.easypaisaAccountName
		
		const html = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #f97316;">Payment Reminder - Order ${order._id}</h2>
				<p>Dear ${order.shippingName},</p>
				<p>We noticed that your payment for order <strong>#${String(order._id).slice(-8).toUpperCase()}</strong> has not been received yet.</p>
				<p><strong>Order Total:</strong> ${formatPKR(order.totalAmount)}</p>
				<p><strong>Payment Method:</strong> ${paymentMethodName}</p>
				<p><strong>Send payment to:</strong> <span style="font-size: 24px; font-weight: bold; color: #f97316;">03004056650</span></p>
				${accountNumber ? `<p><strong>Your Account Number:</strong> ${accountNumber}</p>` : ''}
				${accountName ? `<p><strong>Your Account Name:</strong> ${accountName}</p>` : ''}
				<p>Please complete your payment to process your order. You can send payment through ${paymentMethodName} or any other banking app.</p>
				<p>If you have already made the payment, please contact us with your payment reference number.</p>
				<p>Thank you for your order!</p>
			</div>
		`
		const text = `Payment Reminder\n\nYour payment for order ${order._id} has not been received.\n\nOrder Total: ${formatPKR(order.totalAmount)}\nPayment Method: ${paymentMethodName}\nSend payment to: 03004056650\n\nPlease complete your payment to process your order.\n\nThank you!`
		
		const emailResult = await sendEmail({ 
			to: userEmail, 
			subject: `Payment Reminder - Order ${order._id}`,
			text,
			html
		})
		
		if (!emailResult.success && !emailResult.skipped) {
			return json(false, 'Failed to send email', undefined, undefined, 500)
		}
		
		return json(true, 'Payment reminder sent', { emailSent: emailResult.success })
	} catch (err: any) {
		console.error('POST /api/orders/:id/remind-payment error', err)
		return json(false, err.message || 'Failed to send reminder', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

