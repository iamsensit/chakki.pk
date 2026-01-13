import mongoose, { Schema, models, model } from 'mongoose'

const VariantSchema = new Schema({
	label: { type: String, required: true },
	unitWeight: { type: Number, required: true },
	unit: { type: String, enum: ['kg', 'g', 'half_kg', 'quarter_kg', 'l', 'ml', 'pcs', 'pack', 'unit'], default: 'kg' }, // Unit types: kg, g, half_kg, quarter_kg, l, ml, pcs (pieces), pack, unit
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
	category: String, // Main category (for backward compatibility)
	subCategory: String, // Sub-category (e.g., "Pulses")
	subSubCategory: String, // Sub-sub-category (e.g., "With Peals")
	badges: { type: [String], default: [] },
	images: { type: [String], default: [] },
	moq: { type: Number, default: 1 },
	isWholesale: { type: Boolean, default: true },
	inStock: { type: Boolean, default: true },
	popularity: { type: Number, default: 0 },
	mainPrice: { type: Number, default: null }, // Main display price for product detail page
	mainPriceUnit: { type: String, default: null }, // Unit for main price (e.g., 'kg', 'half kg', 'unit', 'pcs')
	// Analytics fields for real-time tracking
	totalSales: { type: Number, default: 0 }, // Total quantity sold (all time)
	totalRevenue: { type: Number, default: 0 }, // Total revenue generated (all time)
	recentSales: { type: Number, default: 0 }, // Sales in last 7 days
	recentRevenue: { type: Number, default: 0 }, // Revenue in last 7 days
	viewCount: { type: Number, default: 0 }, // Number of times product page was viewed
	lastSoldAt: { type: Date, default: null }, // Last time product was sold
	trendingScore: { type: Number, default: 0 }, // Calculated score for trending (based on recent sales velocity)
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
