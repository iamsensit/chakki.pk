import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Account from '@/models/Account'
import Settings from '@/models/Settings'
import { auth } from '@/app/lib/auth'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
  return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET() {
  await connectToDatabase()
  const accounts = await Account.find().sort({ code: 1 }).lean()
  const settings = await Settings.findOne().lean()
  const accountsList = Array.isArray(accounts) ? accounts : []
  const settingsDoc = Array.isArray(settings) ? null : settings
  return json(true, 'OK', { accounts: accountsList, settings: settingsDoc })
}

export async function POST(req: NextRequest) {
  await connectToDatabase()
  const session = await auth()
  if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)
  const body = await req.json()
  if (body.seedDefaults) {
    // Seed minimal chart of accounts if not already exists
    const existing = await Account.findOne()
    if (!existing) {
      await Account.insertMany([
        { code: '1000', name: 'Cash in Hand', type: 'ASSET' },
        { code: '1010', name: 'Bank', type: 'ASSET' },
        { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
        { code: '1400', name: 'Inventory', type: 'ASSET' },
        { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
        { code: '2100', name: 'Tax Payable', type: 'LIABILITY' },
        { code: '3000', name: 'Owner\'s Equity', type: 'EQUITY' },
        { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
        { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
        { code: '5100', name: 'Utilities Expense', type: 'EXPENSE' },
        { code: '5200', name: 'Rent Expense', type: 'EXPENSE' },
        { code: '5300', name: 'Salary Expense', type: 'EXPENSE' },
        { code: '5400', name: 'Misc Expense', type: 'EXPENSE' },
      ])
      const cash = await Account.findOne({ code: '1000' })
      const bank = await Account.findOne({ code: '1010' })
      const sales = await Account.findOne({ code: '4000' })
      const cogs = await Account.findOne({ code: '5000' })
      const inv = await Account.findOne({ code: '1400' })
      const ar = await Account.findOne({ code: '1200' })
      const tax = await Account.findOne({ code: '2100' })
      await Settings.create({
        defaultAccounts: {
          cashAccountId: cash?._id,
          bankAccountId: bank?._id,
          salesAccountId: sales?._id,
          cogsAccountId: cogs?._id,
          inventoryAccountId: inv?._id,
          arAccountId: ar?._id,
          taxPayableAccountId: tax?._id,
        },
        taxRates: [{ name: 'Standard', rate: 0 }],
      })
    }
    return json(true, 'Seeded')
  }
  // Create / update account
  const { id, code, name, type, parentId, isActive } = body
  if (id) {
    const updated = await Account.findByIdAndUpdate(id, { code, name, type, parentId: parentId || null, isActive }, { new: true })
    return json(true, 'Updated', { account: updated })
  } else {
    const created = await Account.create({ code, name, type, parentId: parentId || null, isActive: isActive ?? true })
    return json(true, 'Created', { account: created })
  }
}

export const dynamic = 'force-dynamic'
