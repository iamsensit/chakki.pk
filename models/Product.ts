import mongoose, { Schema, models, model } from 'mongoose'

const VariantSchema = new Schema({
	label: { type: String, required: true },
	unitWeight: { type: Number, required: true },
	unit: { type: String, enum: ['kg', 'g', 'l', 'ml', 'pcs', 'pack'], default: 'kg' }, // Unit types: kg, g, l, ml, pcs (pieces), pack
	sku: { type: String, required: true, unique: true },
	pricePerKg: { type: Number, required: true }, // Base price per kg (for weight) or per liter (for volume) or per unit (for pcs/pack)
	costPerKg: { type: Number, default: 0 }, // Cost per kg (for weight) or per liter (for volume) or per unit (for pcs/pack) - for inventory investment calculation
	stockQty: { type: Number, default: 0 },
}, { _id: true })

const TierSchema = new Schema({
	minQty: { type: Number, required: true },
	maxQty: { type: Number, default: null },
	pricePerKg: { type: Number, required: true },
}, { _id: false })

const ProductSchema = new Schema({
	slug: { type: String, required: true, unique: true },
	title: { type: String, required: true },
	description: { type: String, required: true },
	brand: String,
	category: String,
	badges: { type: [String], default: [] },
	images: { type: [String], default: [] },
	moq: { type: Number, default: 1 },
	isWholesale: { type: Boolean, default: true },
	inStock: { type: Boolean, default: true },
	popularity: { type: Number, default: 0 },
	variants: { type: [VariantSchema], default: [] },
	tiers: { type: [TierSchema], default: [] },
	relatedProducts: { 
		type: [{ 
			type: Schema.Types.ObjectId, 
			ref: 'Product' 
		}], 
		default: [] 
	}, // Array of product ObjectId references
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
})

ProductSchema.pre('save', function (next) {
	(this as any).updatedAt = new Date()
	next()
})

export type ProductDocument = mongoose.InferSchemaType<typeof ProductSchema>

export default models.Product || model('Product', ProductSchema)
