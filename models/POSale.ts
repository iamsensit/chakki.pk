import { Schema, models, model } from 'mongoose'

const POSLineSchema = new Schema({
  productId: { type: String, required: true },
  variantId: { type: String, default: null },
  title: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
}, { _id: false })

const POSaleSchema = new Schema({
  receiptNumber: { type: String, required: true, unique: true },
  paymentMethod: { type: String, enum: ['CASH', 'CARD'], required: true },
  items: { type: [POSLineSchema], default: [] },
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
})

export default models.POSale || model('POSale', POSaleSchema)


