import { Schema, models, model } from 'mongoose'

const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  image: { type: String, default: '' }, // can be /public path or external URL
  description: { type: String, default: '' },
  displayOrder: { type: Number, default: 1000 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

export default models.Category || model('Category', CategorySchema)


