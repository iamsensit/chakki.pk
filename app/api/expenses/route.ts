import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Expense from '@/models/Expense'
import Settings from '@/models/Settings'
import { JournalEntry } from '@/models/Journal'
import { auth } from '@/app/lib/auth'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
  return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET() {
  await connectToDatabase()
  const items = await Expense.find().sort({ date: -1 }).lean()
  return json(true, 'OK', { items })
}

export async function POST(req: NextRequest) {
  await connectToDatabase()
  const session = await auth()
  if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)
  const body = await req.json()
  const exp = await Expense.create({
    date: body.date ? new Date(body.date) : new Date(),
    category: body.category || 'Misc',
    amount: Number(body.amount || 0),
    paymentMethod: body.paymentMethod || 'CASH',
    description: body.description || '',
    attachmentUrl: body.attachmentUrl || '',
  })
  // Auto-post to GL
  const settings = await Settings.findOne()
  if (settings) {
    const cashId = body.paymentMethod === 'BANK' ? settings.defaultAccounts.bankAccountId : settings.defaultAccounts.cashAccountId
    const expenseAccountCode = body.category?.toLowerCase().includes('util') ? '5100' : body.category?.toLowerCase().includes('rent') ? '5200' : '5400'
    // look up account by code
    const expenseAccount = await (await import('@/models/Account')).default.findOne({ code: expenseAccountCode })
    if (cashId && expenseAccount?._id) {
      const entry = await JournalEntry.create({
        date: exp.date,
        source: 'EXPENSE',
        ref: String(exp._id),
        notes: exp.description,
        lines: [
          { accountId: expenseAccount._id, debit: exp.amount, credit: 0, description: exp.category },
          { accountId: cashId, debit: 0, credit: exp.amount, description: exp.paymentMethod },
        ],
      })
      exp.posted = true
      exp.journalEntryId = entry._id
      await exp.save()
    }
  }
  return json(true, 'Created', { item: exp })
}

export const dynamic = 'force-dynamic'
