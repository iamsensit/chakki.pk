import { Schema, model, models } from 'mongoose'

const JournalLineSchema = new Schema({
  accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  description: { type: String, default: '' },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
})

const JournalEntrySchema = new Schema({
  date: { type: Date, default: Date.now },
  source: { type: String, default: '' }, // e.g. 'POS', 'ORDER', 'EXPENSE', 'PAYROLL'
  ref: { type: String, default: '' }, // external reference id
  notes: { type: String, default: '' },
  lines: { type: [JournalLineSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

JournalEntrySchema.pre('save', function (next) {
  ;(this as any).updatedAt = new Date()
  next()
})

export const JournalEntry = models.JournalEntry || model('JournalEntry', JournalEntrySchema)
export const JournalLine = models.JournalLine || model('JournalLine', JournalLineSchema)


