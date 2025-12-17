import { Schema, model, models } from 'mongoose'

const SettingsSchema = new Schema({
  defaultAccounts: {
    cashAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    bankAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    salesAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    cogsAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    inventoryAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    arAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    taxPayableAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
  },
  taxRates: [{ name: String, rate: Number }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

SettingsSchema.pre('save', function (next) {
  ;(this as any).updatedAt = new Date()
  next()
})

export default models.Settings || model('Settings', SettingsSchema)


