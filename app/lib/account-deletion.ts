import { connectToDatabase } from './mongodb'
import User from '@/models/User'
import Cart from '@/models/Cart'
import Wishlist from '@/models/Wishlist'
import UserDeliveryLocation from '@/models/UserDeliveryLocation'
import Review from '@/models/Review'
import Order from '@/models/Order'
import AuditLog from '@/models/AuditLog'
import { sendEmail } from './email'
import { renderEmailTemplate } from './email'

/**
 * Generates a random anonymized user ID
 */
function generateAnonymizedUserId(): string {
	return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}


/**
 * Deletes all personal data and anonymizes retained data for compliance
 */
export async function deleteUserAccount(
	userId: string,
	userEmail: string,
	options: {
		sendConfirmationEmail?: boolean
		ipAddress?: string
		userAgent?: string
	} = {}
): Promise<{
	success: boolean
	anonymizedUserId?: string
	deletedCounts: {
		user: number
		cart: number
		wishlist: number
		deliveryLocations: number
		reviews: number
		ordersAnonymized: number
	}
	error?: string
}> {
	try {
		await connectToDatabase()
		
		const anonymizedUserId = generateAnonymizedUserId()
		const deletedCounts = {
			user: 0,
			cart: 0,
			wishlist: 0,
			deliveryLocations: 0,
			reviews: 0,
			ordersAnonymized: 0
		}
		
	// 1. Delete personal data
	// Delete User account (credentials, payment methods, profile)
	const userDeleteResult = await User.deleteOne({ 
		$or: [
			{ email: userEmail },
			{ _id: userId }
		]
	})
	deletedCounts.user = userDeleteResult.deletedCount || 0
	
	// Delete Cart (try both email and userId as userId might be either)
	const cartDeleteResult = await Cart.deleteMany({ 
		$or: [
			{ userId: userEmail },
			{ userId: userId }
		]
	})
	deletedCounts.cart = cartDeleteResult.deletedCount || 0
	
	// Delete Wishlist (try both email and userId)
	const wishlistDeleteResult = await Wishlist.deleteMany({ 
		$or: [
			{ userId: userEmail },
			{ userId: userId }
		]
	})
	deletedCounts.wishlist = wishlistDeleteResult.deletedCount || 0
	
	// Delete Delivery Locations
	const deliveryDeleteResult = await UserDeliveryLocation.deleteMany({ 
		$or: [
			{ userId: userEmail },
			{ userId: userId }
		]
	})
	deletedCounts.deliveryLocations = deliveryDeleteResult.deletedCount || 0
	
	// Delete Reviews (user-generated content with PII)
	const reviewDeleteResult = await Review.deleteMany({ 
		$or: [
			{ userId: userEmail },
			{ userId: userId },
			{ userEmail: userEmail }
		]
	})
	deletedCounts.reviews = reviewDeleteResult.deletedCount || 0
	
	// 2. Anonymize retained data for compliance
	// Anonymize Orders (retain for legal/compliance but remove PII)
	// Try both email and userId as userId might be either
	const ordersToAnonymize = await Order.find({ 
		$or: [
			{ userId: userEmail },
			{ userId: userId }
		]
	})
	
	for (const order of ordersToAnonymize) {
		order.userId = anonymizedUserId
		order.shippingName = '[DELETED]'
		order.shippingPhone = '[DELETED]'
		order.shippingAddress = '[DELETED]'
		order.city = '[DELETED]'
		order.jazzcashAccountName = ''
		order.jazzcashAccountNumber = ''
		order.easypaisaAccountName = ''
		order.easypaisaAccountNumber = ''
		order.paymentReference = ''
		order.paymentProofDataUrl = ''
		
		await order.save()
	}
	
	deletedCounts.ordersAnonymized = ordersToAnonymize.length
		
		// 3. Create audit log entry
		await AuditLog.create({
			action: 'ACCOUNT_DELETED',
			userId: userEmail,
			userEmail: userEmail,
			anonymizedUserId: anonymizedUserId,
			details: {
				deletedCounts,
				timestamp: new Date().toISOString()
			},
			ipAddress: options.ipAddress,
			userAgent: options.userAgent
		})
		
		// 4. Send confirmation email (optional)
		if (options.sendConfirmationEmail && userEmail) {
			try {
				const emailHtml = renderEmailTemplate({
					title: 'Account Deletion Confirmation',
					intro: 'Your account deletion request has been processed.',
					body: `
						<p>We have successfully deleted your account and all associated personal data from our system.</p>
						<p><strong>What was deleted:</strong></p>
						<ul>
							<li>Your login credentials (email, password)</li>
							<li>Profile information (name, phone number, profile picture)</li>
							<li>Saved payment methods</li>
							<li>Shipping and delivery addresses</li>
							<li>Wishlist and saved cart items</li>
							<li>Product reviews</li>
						</ul>
						<p><strong>What was retained (anonymized):</strong></p>
						<ul>
							<li>Order history and transaction records (for legal and accounting compliance)</li>
							<li>Fulfillment and shipping records</li>
						</ul>
						<p>All retained data has been anonymized and cannot be linked back to you.</p>
						<p>If you have any questions or concerns, please contact our support team.</p>
					`,
					footer: 'This is an automated message. Please do not reply to this email.'
				})
				
				await sendEmail({
					to: userEmail,
					subject: 'Account Deletion Confirmation - Chakki',
					html: emailHtml
				})
			} catch (emailError: any) {
				// Log email error but don't fail the deletion
				console.error('[ACCOUNT DELETION] Failed to send confirmation email:', emailError)
			}
		}
		
		return {
			success: true,
			anonymizedUserId,
			deletedCounts
		}
	} catch (error: any) {
		console.error('[ACCOUNT DELETION] Error:', error)
		return {
			success: false,
			deletedCounts: {
				user: 0,
				cart: 0,
				wishlist: 0,
				deliveryLocations: 0,
				reviews: 0,
				ordersAnonymized: 0
			},
			error: error.message || 'Failed to delete account'
		}
	}
}

