import { Schema, models, model } from 'mongoose'

const OrderItemSchema = new Schema({
	productId: { type: String, required: true },
	variantId: { type: String, default: null },
	quantity: { type: Number, required: true },
	unitPrice: { type: Number, required: true },
}, { _id: true })

const OrderSchema = new Schema({
	userId: { type: String, default: null },
	status: { type: String, default: 'PENDING' },
	paymentMethod: { type: String, enum: ['COD', 'JAZZCASH'], required: true },
	paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
	isFirstCodFree: { type: Boolean, default: false },
	items: { type: [OrderItemSchema], default: [] },
	totalAmount: { type: Number, required: true },
	deliveryFee: { type: Number, default: 0 },
	shippingName: { type: String, required: true },
	shippingPhone: { type: String, required: true },
	shippingAddress: { type: String, required: true },
	city: { type: String, required: true },
	paymentReference: { type: String, default: '' },
	paymentProofDataUrl: { type: String, default: '' },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
})

OrderSchema.pre('save', function (next) {
	(this as any).updatedAt = new Date()
	next()
})

export default models.Order || model('Order', OrderSchema)
