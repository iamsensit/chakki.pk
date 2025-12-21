import { Schema, models, model } from 'mongoose'

const CategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  image: { type: String, default: '' }, // can be /public path or external URL
  description: { type: String, default: '' },
  displayOrder: { type: Number, default: 1000 },
  isActive: { type: Boolean, default: true },
  parentCategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null }, // Reference to parent category
  level: { type: Number, default: 0 }, // 0 = main category, 1 = sub-category, 2 = sub-sub-category
}, { timestamps: true })

// Compound unique index: name + parentCategory (allows same name in different parents)
CategorySchema.index({ name: 1, parentCategory: 1 }, { unique: true })

export default models.Category || model('Category', CategorySchema)


