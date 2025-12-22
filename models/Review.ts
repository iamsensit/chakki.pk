import { Schema, models, model } from 'mongoose'

const ReviewSchema = new Schema({
	userId: { type: String, required: true },
	userName: { type: String, required: true },
	userEmail: { type: String, required: true },
	productId: { type: String, required: true },
	variantId: { type: String, default: null },
	orderId: { type: String, default: null }, // Link review to order
	rating: { type: Number, required: true, min: 1, max: 5 },
	comment: { type: String, default: '' },
	images: { type: [String], default: [] }, // Optional review images
	verifiedPurchase: { type: Boolean, default: false }, // True if user actually purchased
	helpful: { type: Number, default: 0 }, // Number of helpful votes
	status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'APPROVED' },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

// Index for efficient queries
ReviewSchema.index({ productId: 1, status: 1 })
ReviewSchema.index({ userId: 1, productId: 1 }) // Prevent duplicate reviews

ReviewSchema.pre('save', function (next) {
	(this as any).updatedAt = new Date()
	next()
})

export default models.Review || model('Review', ReviewSchema)

