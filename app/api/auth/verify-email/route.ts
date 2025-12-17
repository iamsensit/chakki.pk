import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const body = await req.json()
		const email = String(body?.email || '').trim().toLowerCase()
		const token = String(body?.token || '').trim()

		if (!email || !token) {
			return json(false, 'Email and code are required', undefined, undefined, 400)
		}

		const user = await User.findOne({ email })
		if (!user) return json(false, 'User not found', undefined, undefined, 404)
		if (!user.verificationToken) return json(false, 'No verification in progress', undefined, undefined, 400)
		if (user.verificationToken !== token) return json(false, 'Invalid verification code', undefined, undefined, 400)

		user.emailVerified = true
		user.verificationToken = ''
		await user.save()

		return json(true, 'Email verified successfully')
	} catch (err: any) {
		console.error('Verify email error:', err)
		return json(false, 'Failed to verify email', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

