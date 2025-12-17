import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import { JournalEntry } from '@/models/Journal'
import Account from '@/models/Account'
import { auth } from '@/app/lib/auth'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
  return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET(req: NextRequest) {
  await connectToDatabase()
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const q: any = {}
  if (from || to) {
    q.date = {}
    if (from) q.date.$gte = new Date(from)
    if (to) q.date.$lte = new Date(to)
  }
  const entries = await JournalEntry.find(q).sort({ date: -1 }).lean()
  return json(true, 'OK', { entries })
}

export async function POST(req: NextRequest) {
  await connectToDatabase()
  const session = await auth()
  if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)
  const body = await req.json()
  // Expect { date, source, ref, notes, lines: [{accountId, debit, credit, description}] }
  const lines = body.lines || []
  const sumDebit = lines.reduce((a: number, l: any) => a + (Number(l.debit) || 0), 0)
  const sumCredit = lines.reduce((a: number, l: any) => a + (Number(l.credit) || 0), 0)
  if (Math.abs(sumDebit - sumCredit) > 0.001) {
    return json(false, 'Journal not balanced (debits must equal credits)', undefined, { sumDebit, sumCredit }, 400)
  }
  // Validate accounts exist
  const ids = lines.map((l: any) => l.accountId).filter(Boolean)
  const count = await Account.countDocuments({ _id: { $in: ids } })
  if (count !== ids.length) return json(false, 'Invalid account in journal lines', undefined, undefined, 400)
  const created = await JournalEntry.create({
    date: body.date ? new Date(body.date) : new Date(),
    source: body.source || '',
    ref: body.ref || '',
    notes: body.notes || '',
    lines: lines.map((l: any) => ({
      accountId: l.accountId,
      description: l.description || '',
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
    })),
  })
  return json(true, 'Posted', { entry: created })
}

export const dynamic = 'force-dynamic'
