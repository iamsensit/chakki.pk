import mongoose, { Schema, models, model } from 'mongoose'

const CartItemSchema = new Schema({
  productId: { type: String, required: true },
  variantId: { type: String, required: false },
  title: { type: String, required: true },
  variantLabel: { type: String, required: false },
  image: { type: String, required: false },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: false })

const CartSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  items: { type: [CartItemSchema], default: [] },
  updatedAt: { type: Date, default: Date.now }
})

CartSchema.pre('save', function (next) {
  (this as any).updatedAt = new Date()
  next()
})

export type CartDocument = mongoose.InferSchemaType<typeof CartSchema>

export default models.Cart || model('Cart', CartSchema)
