import mongoose, { Schema, models, model } from 'mongoose'

const RequestSchema = new Schema({
	type: { type: String, enum: ['delivery_area', 'out_of_stock'], required: true },
	userEmail: { type: String, required: true },
	userName: { type: String },
	status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
	
	// For delivery area requests
	address: { type: String },
	city: { type: String },
	latitude: { type: Number },
	longitude: { type: Number },
	
	// For out of stock requests
	productId: { type: Schema.Types.ObjectId, ref: 'Product' },
	productTitle: { type: String },
	variantId: { type: Schema.Types.ObjectId },
	variantLabel: { type: String },
	
	notes: { type: String },
	adminNotes: { type: String },
	
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

RequestSchema.pre('save', function (next) {
	(this as any).updatedAt = new Date()
	next()
})

export type RequestDocument = mongoose.InferSchemaType<typeof RequestSchema>

export default models.Request || model('Request', RequestSchema)


