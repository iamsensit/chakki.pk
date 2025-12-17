import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { generateToken } from '@/app/lib/crypto'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST() {
	await connectToDatabase()
	const session = await auth()
	if (!session?.user?.email) return json(false, 'Unauthorized', undefined, undefined, 401)
	const token = generateToken()
	await User.updateOne({ email: session.user.email }, { $set: { verificationToken: token, emailVerified: false } })
	// Simulate sending email by returning token (in real app, email it)
	return json(true, 'Verification token generated', { token })
}

export const dynamic = 'force-dynamic'
