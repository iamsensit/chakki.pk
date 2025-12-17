import { Schema, model, models } from 'mongoose'

const ExpenseSchema = new Schema({
  date: { type: Date, default: Date.now },
  category: { type: String, required: true }, // or ObjectId to ExpenseCategory
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['CASH', 'BANK'], required: true },
  description: { type: String, default: '' },
  attachmentUrl: { type: String, default: '' },
  posted: { type: Boolean, default: false },
  journalEntryId: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

ExpenseSchema.pre('save', function (next) {
  ;(this as any).updatedAt = new Date()
  next()
})

export default models.Expense || model('Expense', ExpenseSchema)


