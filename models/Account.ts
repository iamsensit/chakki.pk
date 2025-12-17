import { Schema, model, models } from 'mongoose'

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'

const AccountSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'], required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

AccountSchema.pre('save', function (next) {
  ;(this as any).updatedAt = new Date()
  next()
})

export default models.Account || model('Account', AccountSchema)


