import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import Settings from '@/models/Settings'
import Account from '@/models/Account'
import { auth } from '@/app/lib/auth'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
  return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET() {
  await connectToDatabase()
  const settings = await Settings.findOne().lean()
  const accounts = await Account.find().sort({ code: 1 }).lean()
  const settingsDoc = Array.isArray(settings) ? null : settings
  const accountsList = Array.isArray(accounts) ? accounts : []
  return json(true, 'OK', { settings: settingsDoc, accounts: accountsList })
}

export async function PUT(req: NextRequest) {
  await connectToDatabase()
  const session = await auth()
  if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)
  const body = await req.json()
  const upd = await Settings.findOneAndUpdate({}, body, { new: true, upsert: true })
  return json(true, 'Updated', { settings: upd })
}

export const dynamic = 'force-dynamic'
