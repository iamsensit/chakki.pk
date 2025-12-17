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
		const { token, email } = body

		if (!token || !email) {
			return json(false, 'Token and email required', undefined, undefined, 400)
		}

		// Find user by email
		const user = await User.findOne({ email })
		if (!user) {
			return json(false, 'Invalid reset link', undefined, undefined, 400)
		}

		// Check if token matches
		if (user.verificationToken !== token) {
			return json(false, 'Invalid or expired reset link', undefined, undefined, 400)
		}

		// Token is valid
		return json(true, 'Reset link is valid')
	} catch (err: any) {
		console.error('Reset password validate error:', err)
		return json(false, 'Failed to validate reset link', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'


