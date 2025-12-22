import { formatCurrencyPKR } from './price'
import Product from '@/models/Product'
import { connectToDatabase } from '@/app/lib/mongodb'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const logoUrl = `${baseUrl}/icon.png`
const contactPhone = '03393399393'
const contactEmail = 'info@chakki.pk'

export async function enrichOrderItems(items: OrderItem[]) {
	await connectToDatabase()
	const enriched = await Promise.all(items.map(async (item) => {
		try {
			const product = await Product.findById(item.productId).lean()
			if (product && !Array.isArray(product)) {
				const variant = item.variantId 
					? (product as any).variants?.find((v: any) => String(v._id) === String(item.variantId))
					: (product as any).variants?.[0]
				
				// Ensure quantity and unitPrice are preserved as numbers
				const quantity = typeof item.quantity === 'number' ? item.quantity : (parseInt(String(item.quantity || 0)) || 0)
				const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : (parseFloat(String(item.unitPrice || 0)) || 0)
				
				return {
					...item,
					quantity: quantity,
					unitPrice: unitPrice,
					title: (product as any).title || 'Product',
					image: Array.isArray((product as any).images) && (product as any).images.length > 0 
						? (product as any).images[0] 
						: undefined,
					variantLabel: variant?.label || undefined
				}
			}
		} catch (err) {
			console.error('Failed to fetch product for email', item.productId, err)
		}
		// Ensure quantity and unitPrice are preserved even if product fetch fails
		const quantity = typeof item.quantity === 'number' ? item.quantity : (parseInt(String(item.quantity || 0)) || 0)
		const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : (parseFloat(String(item.unitPrice || 0)) || 0)
		
		return {
			...item,
			quantity: quantity,
			unitPrice: unitPrice,
			title: 'Product',
			image: undefined,
			variantLabel: undefined
		}
	}))
	return enriched
}

interface OrderItem {
	productId: string
	variantId?: string
	quantity: number
	unitPrice: number
	title?: string
	variantLabel?: string
	image?: string
}

interface OrderData {
	_id: string
	status: string
	paymentMethod: 'COD' | 'JAZZCASH' | 'EASYPAISA' | 'OTHER'
	paymentStatus?: string // Optional, removed from Order model
	totalAmount: number
	deliveryFee: number
	deliveryType?: 'STANDARD' | 'EXPRESS'
	shippingName: string
	shippingPhone: string
	shippingAddress: string
	city: string
	paymentReference?: string
	items: OrderItem[]
	createdAt: string
	updatedAt?: string
}

function formatDate(date: string | Date) {
	const d = new Date(date)
	return d.toLocaleDateString('en-PK', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	})
}

function getStatusBadge(status: string, paymentStatus?: string) {
	const statusMap: Record<string, { color: string; bg: string; text: string }> = {
		PENDING: { color: '#f59e0b', bg: '#fef3c7', text: 'PENDING' },
		CONFIRMED: { color: '#10b981', bg: '#d1fae5', text: 'CONFIRMED' },
		SHIPPING_IN_PROCESS: { color: '#3b82f6', bg: '#dbeafe', text: 'SHIPPING IN PROCESS' },
		SHIPPED: { color: '#3b82f6', bg: '#dbeafe', text: 'SHIPPED' },
		DELIVERED: { color: '#10b981', bg: '#d1fae5', text: 'DELIVERED' },
		CANCELLED: { color: '#ef4444', bg: '#fee2e2', text: 'CANCELLED' }
	}
	const paymentMap: Record<string, { color: string; bg: string }> = {
		PENDING: { color: '#f59e0b', bg: '#fef3c7' },
		PAID: { color: '#10b981', bg: '#d1fae5' },
		FAILED: { color: '#ef4444', bg: '#fee2e2' }
	}
	
	const statusStyle = statusMap[status] || statusMap.PENDING
	const paymentStyle = paymentStatus ? paymentMap[paymentStatus] : null
	
	return { statusStyle, paymentStyle }
}

function renderOrderItems(items: OrderItem[]) {
	return items.map((item, idx) => {
		// Ensure quantity and unitPrice are numbers, not undefined
		const quantity = typeof item.quantity === 'number' ? item.quantity : (parseInt(String(item.quantity || 0)) || 0)
		const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : (parseFloat(String(item.unitPrice || 0)) || 0)
		const totalPrice = quantity * unitPrice
		
		return `
		<tr>
			<td style="padding:12px;background:#f8fafc;border-radius:8px;">
				<table width="100%" cellpadding="0" cellspacing="0">
					<tr>
						<td width="80" style="padding-right:12px;vertical-align:top;">
							${item.image ? `<img src="${item.image}" alt="${item.title || 'Product'}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;display:block;" />` : '<div style="width:64px;height:64px;background:#e2e8f0;border-radius:6px;"></div>'}
						</td>
						<td style="vertical-align:top;">
							<div style="font-weight:600;color:#0f172a;margin-bottom:4px;">${item.title || 'Product'}</div>
							${item.variantLabel ? `<div style="font-size:13px;color:#64748b;margin-bottom:4px;">${item.variantLabel}</div>` : ''}
							<div style="font-size:13px;color:#64748b;">Quantity: ${quantity}</div>
						</td>
						<td align="right" style="vertical-align:top;">
							<div style="font-weight:600;color:#0f172a;margin-bottom:4px;">${formatCurrencyPKR(totalPrice)}</div>
							<div style="font-size:12px;color:#94a3b8;">${formatCurrencyPKR(unitPrice)} each</div>
						</td>
					</tr>
				</table>
			</td>
		</tr>
		`
	}).join('')
}

export function renderOrderEmailTemplate(order: OrderData, title: string, message: string, type: 'placed' | 'payment' | 'confirmed' | 'shipped' | 'delivered' = 'placed', deliveryType?: string, deliveryTime?: string) {
	const { statusStyle, paymentStyle } = getStatusBadge(order.status, undefined)
	const subtotal = order.totalAmount - order.deliveryFee
	const orderDeliveryType = deliveryType || order.deliveryType || 'STANDARD'
	const orderDeliveryTime = deliveryTime || (orderDeliveryType === 'EXPRESS' ? '1-2 days' : '3-5 days')
	
	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
			<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
				<tr>
					<td align="center">
						<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
							<!-- Header -->
							<tr>
								<td style="background:#0f172a;padding:20px;text-align:center;">
									<img src="${logoUrl}" alt="Chakki" style="height:40px;width:auto;display:block;margin:0 auto;" />
									<div style="color:#ffffff;font-size:14px;margin-top:8px;opacity:0.9;">by Digital Dervish</div>
								</td>
							</tr>
							
							<!-- Content -->
							<tr>
								<td style="padding:24px;">
									<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">${title}</h1>
									<p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">${message}</p>
									
									<!-- Order Header -->
									<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:24px;">
										<tr>
											<td>
												<div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:8px;">Order Details</div>
												<div style="font-size:13px;color:#64748b;margin-bottom:4px;">Order ID: ${order._id}</div>
												<div style="font-size:13px;color:#64748b;">Placed on: ${formatDate(order.createdAt)}</div>
											</td>
											<td align="right">
												<div style="display:inline-block;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${statusStyle.bg};color:${statusStyle.color};">
													${statusStyle.text}
												</div>
											</td>
										</tr>
									</table>
									
									<!-- Order Items -->
									<div style="margin-bottom:24px;">
										<div style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:12px;">Order Items</div>
										<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 8px;">
											${renderOrderItems(order.items)}
										</table>
									</div>
									
									<!-- Order Summary -->
									<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 16px;">
										<tr>
											<!-- Shipping Information -->
											<td width="48%" style="vertical-align:top;">
												<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
													<div style="font-weight:600;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
														<span style="color:#f97316;">📍</span>
														<span>Shipping Information</span>
													</div>
													<div style="font-size:13px;color:#64748b;line-height:1.8;">
														<div><strong>Name:</strong> ${order.shippingName}</div>
														<div><strong>Phone:</strong> ${order.shippingPhone}</div>
														<div><strong>Address:</strong> ${order.shippingAddress}</div>
														<div><strong>City:</strong> ${order.city}</div>
														${type === 'confirmed' ? `
															<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
																<div><strong>Delivery Method:</strong> ${orderDeliveryType === 'EXPRESS' ? '🚀 Express Delivery' : '📦 Standard Delivery'}</div>
																<div><strong>Expected Delivery:</strong> ${orderDeliveryTime}</div>
															</div>
														` : ''}
													</div>
												</div>
											</td>
											
											<!-- Payment Information -->
											<td width="4%"></td>
											
											<td width="48%" style="vertical-align:top;">
												<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
													<div style="font-weight:600;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
														<span style="color:#f97316;">📦</span>
														<span>Payment Information</span>
													</div>
													<div style="font-size:13px;line-height:1.8;">
														<div style="display:flex;justify-content:space-between;margin-bottom:8px;">
															<span style="color:#64748b;">Payment Method:</span>
															<span style="font-weight:600;color:#0f172a;">${order.paymentMethod}</span>
													</div>
														${order.paymentReference ? `
															<div style="display:flex;justify-content:space-between;margin-bottom:8px;">
																<span style="color:#64748b;">Reference:</span>
																<span style="font-weight:600;color:#0f172a;">${order.paymentReference}</span>
															</div>
														` : ''}
														<div style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:12px;">
															<div style="display:flex;justify-content:space-between;margin-bottom:8px;">
																<span style="color:#64748b;">Subtotal:</span>
																<span style="color:#0f172a;">${formatCurrencyPKR(subtotal)}</span>
															</div>
															${order.deliveryFee > 0 ? `
																<div style="display:flex;justify-content:space-between;margin-bottom:8px;">
																	<span style="color:#64748b;">Delivery Fee:</span>
																	<span style="color:#0f172a;">${formatCurrencyPKR(order.deliveryFee)}</span>
																</div>
															` : ''}
															<div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:12px;">
																<span style="font-weight:700;font-size:16px;color:#0f172a;">Total:</span>
																<span style="font-weight:700;font-size:16px;color:#f97316;">${formatCurrencyPKR(order.totalAmount)}</span>
															</div>
														</div>
													</div>
												</div>
											</td>
										</tr>
									</table>
									
									<!-- Help Section -->
									<div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:16px;margin-top:24px;">
										<p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">
											<strong>Need help?</strong> If you have any questions about your order, please contact us at 
											<a href="tel:${contactPhone}" style="color:#1e40af;text-decoration:underline;font-weight:600;">${contactPhone}</a> or 
											<a href="${baseUrl}/contact" style="color:#1e40af;text-decoration:underline;font-weight:600;">visit our contact page</a>.
										</p>
									</div>
								</td>
							</tr>
							
							<!-- Footer -->
							<tr>
								<td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
									<p style="margin:0 0 8px;font-size:12px;color:#64748b;">Thank you for choosing Chakki!</p>
									<p style="margin:0;font-size:11px;color:#94a3b8;">
										<a href="${baseUrl}" style="color:#94a3b8;text-decoration:none;">Visit our website</a> | 
										<a href="${baseUrl}/contact" style="color:#94a3b8;text-decoration:none;">Contact us</a>
									</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
	`
}

export function renderWelcomeEmailTemplate(name: string) {
	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
			<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
				<tr>
					<td align="center">
						<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
							<!-- Header -->
							<tr>
								<td style="background:#0f172a;padding:20px;text-align:center;">
									<img src="${logoUrl}" alt="Chakki" style="height:40px;width:auto;display:block;margin:0 auto;" />
									<div style="color:#ffffff;font-size:14px;margin-top:8px;opacity:0.9;">by Digital Dervish</div>
								</td>
							</tr>
							
							<!-- Content -->
							<tr>
								<td style="padding:24px;text-align:center;">
									<div style="font-size:48px;margin-bottom:16px;">🎉</div>
									<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#0f172a;">Welcome to Chakki, ${name}!</h1>
									<p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
										We're thrilled to have you join our community. Start shopping for the best wholesale grains and essentials at unbeatable prices.
									</p>
									
									<a href="${baseUrl}/products" style="display:inline-block;padding:12px 24px;background:#f97316;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px;">Start Shopping</a>
									
									<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin-top:24px;text-align:left;">
										<div style="font-weight:600;color:#0f172a;margin-bottom:12px;">What's next?</div>
										<ul style="margin:0;padding-left:20px;color:#64748b;font-size:13px;line-height:1.8;">
											<li>Browse our wide selection of products</li>
											<li>Set your delivery location for faster checkout</li>
											<li>Enjoy wholesale pricing on bulk orders</li>
											<li>Track your orders in real-time</li>
										</ul>
									</div>
								</td>
							</tr>
							
							<!-- Footer -->
							<tr>
								<td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
									<p style="margin:0 0 8px;font-size:12px;color:#64748b;">Happy shopping!</p>
									<p style="margin:0;font-size:11px;color:#94a3b8;">
										<a href="${baseUrl}" style="color:#94a3b8;text-decoration:none;">Visit our website</a> | 
										<a href="${baseUrl}/contact" style="color:#94a3b8;text-decoration:none;">Contact us</a>
									</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
	`
}

export function renderVerificationEmailTemplate(code: string, name?: string) {
	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
			<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
				<tr>
					<td align="center">
						<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
							<!-- Header -->
							<tr>
								<td style="background:#0f172a;padding:20px;text-align:center;">
									<img src="${logoUrl}" alt="Chakki" style="height:40px;width:auto;display:block;margin:0 auto;" />
									<div style="color:#ffffff;font-size:14px;margin-top:8px;opacity:0.9;">by Digital Dervish</div>
								</td>
							</tr>
							
							<!-- Content -->
							<tr>
								<td style="padding:24px;text-align:center;">
									<div style="font-size:48px;margin-bottom:16px;">✉️</div>
									<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#0f172a;">Verify Your Email</h1>
									<p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
										${name ? `Hi ${name}, ` : ''}Please use the verification code below to confirm your email address.
									</p>
									
									<div style="display:inline-block;padding:16px 24px;border-radius:8px;background:#0f172a;color:#ffffff;font-size:28px;letter-spacing:4px;font-weight:700;margin-bottom:24px;font-family:monospace;">
										${code}
									</div>
									
									<p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
										This code will expire in 1 hour. If you didn't request this code, you can safely ignore this email.
									</p>
								</td>
							</tr>
							
							<!-- Footer -->
							<tr>
								<td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
									<p style="margin:0 0 8px;font-size:12px;color:#64748b;">Need help? Contact us at ${contactPhone}</p>
									<p style="margin:0;font-size:11px;color:#94a3b8;">
										<a href="${baseUrl}" style="color:#94a3b8;text-decoration:none;">Visit our website</a>
									</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
	`
}

export function renderPasswordResetEmailTemplate(resetLink: string, name?: string) {
	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
			<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
				<tr>
					<td align="center">
						<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
							<!-- Header -->
							<tr>
								<td style="background:#0f172a;padding:20px;text-align:center;">
									<img src="${logoUrl}" alt="Chakki" style="height:40px;width:auto;display:block;margin:0 auto;" />
									<div style="color:#ffffff;font-size:14px;margin-top:8px;opacity:0.9;">by Digital Dervish</div>
								</td>
							</tr>
							
							<!-- Content -->
							<tr>
								<td style="padding:24px;text-align:center;">
									<div style="font-size:48px;margin-bottom:16px;">🔐</div>
									<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#0f172a;">Reset Your Password</h1>
									<p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
										${name ? `Hi ${name}, ` : ''}We received a request to reset your password. Click the button below to create a new password.
									</p>
									
									<a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#f97316;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px;">Reset Password</a>
									
									<p style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.6;">
										Or copy and paste this link into your browser:
									</p>
									<p style="margin:0;color:#94a3b8;font-size:12px;word-break:break-all;">
										${resetLink}
									</p>
									
									<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-top:24px;text-align:left;">
										<p style="margin:0;color:#92400e;font-size:12px;line-height:1.6;">
											<strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact us if you have concerns.
										</p>
									</div>
								</td>
							</tr>
							
							<!-- Footer -->
							<tr>
								<td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
									<p style="margin:0 0 8px;font-size:12px;color:#64748b;">Need help? Contact us at ${contactPhone}</p>
									<p style="margin:0;font-size:11px;color:#94a3b8;">
										<a href="${baseUrl}" style="color:#94a3b8;text-decoration:none;">Visit our website</a>
									</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
	`
}

