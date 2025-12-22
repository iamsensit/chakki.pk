import { Schema, models, model } from 'mongoose'

const OrderItemSchema = new Schema({
	productId: { type: String, required: true },
	variantId: { type: String, default: null },
	quantity: { type: Number, required: true },
	unitPrice: { type: Number, required: true },
}, { _id: true })

const OrderSchema = new Schema({
	userId: { type: String, default: null },
	status: { type: String, enum: ['PENDING', 'CONFIRMED', 'SHIPPING_IN_PROCESS', 'SHIPPED', 'DELIVERED', 'CANCELLED'], default: 'PENDING' },
	paymentMethod: { type: String, enum: ['COD', 'JAZZCASH', 'EASYPAISA'], required: true },
	paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
	isFirstCodFree: { type: Boolean, default: false },
	items: { type: [OrderItemSchema], default: [] },
	totalAmount: { type: Number, required: true },
	deliveryFee: { type: Number, default: 0 },
	deliveryType: { type: String, enum: ['STANDARD', 'EXPRESS'], default: 'STANDARD' },
	shippingName: { type: String, required: true },
	shippingPhone: { type: String, required: true },
	shippingAddress: { type: String, required: true },
	city: { type: String, required: true },
	paymentReference: { type: String, default: '' },
	paymentProofDataUrl: { type: String, default: '' },
	jazzcashAccountName: { type: String, default: '' },
	jazzcashAccountNumber: { type: String, default: '' },
	easypaisaAccountName: { type: String, default: '' },
	easypaisaAccountNumber: { type: String, default: '' },
	cancellationReason: { type: String, default: '' },
	refunded: { type: Boolean, default: false },
	refundedAt: { type: Date, default: null },
	refundAmount: { type: Number, default: 0 },
	refundMethod: { type: String, default: '' }, // e.g., 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'
	refundAccountNumber: { type: String, default: '' },
	shippedAt: { type: Date, default: null },
	deliveredAt: { type: Date, default: null },
	cancelledAt: { type: Date, default: null },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
})

OrderSchema.pre('save', function (next) {
	(this as any).updatedAt = new Date()
	next()
})

// In development, clear the model cache to ensure schema updates are applied
if (process.env.NODE_ENV === 'development' && models.Order) {
	delete models.Order
}

export default models.Order || model('Order', OrderSchema)
