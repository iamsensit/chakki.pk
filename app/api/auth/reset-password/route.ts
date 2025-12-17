import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { passwordSchema } from '@/app/lib/validators'
import { hashPassword } from '@/app/lib/crypto'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const body = await req.json()
		const { token, email, password } = body

		if (!token || !email || !password) {
			return json(false, 'Token, email, and password required', undefined, undefined, 400)
		}

		// Validate password
		const passwordResult = passwordSchema.safeParse(password)
		if (!passwordResult.success) {
			return json(false, 'Invalid password', undefined, { password: passwordResult.error.errors[0].message }, 400)
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

		// Update password and clear token
		user.passwordHash = await hashPassword(password)
		user.verificationToken = ''
		await user.save()

		return json(true, 'Password reset successfully')
	} catch (err: any) {
		console.error('Reset password error:', err)
		return json(false, 'Failed to reset password', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'


