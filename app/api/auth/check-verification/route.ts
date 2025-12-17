import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const { email } = await req.json()
		const emailStr = String(email || '').trim().toLowerCase()
		if (!emailStr) return json(false, 'Email is required', undefined, { email: 'Email is required' }, 400)

		const user = await User.findOne({ email: emailStr })
		if (!user) return json(true, 'User not found', { exists: false, verified: false })

		return json(true, 'OK', { exists: true, verified: !!user.emailVerified })
	} catch (err: any) {
		console.error('check-verification error:', err)
		return json(false, 'Failed to check verification', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

