import { Schema, models, model } from 'mongoose'

const WishlistSchema = new Schema({
	userId: { type: String, required: true, unique: true },
	products: { 
		type: [{
			productId: { type: String, required: true },
			variantId: { type: String, default: null },
			addedAt: { type: Date, default: Date.now }
		}], 
		default: [] 
	},
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

// Note: userId index is automatically created by unique: true above
// Removed duplicate index() call to fix Mongoose warning

WishlistSchema.pre('save', function (next) {
	(this as any).updatedAt = new Date()
	next()
})

export default models.Wishlist || model('Wishlist', WishlistSchema)

