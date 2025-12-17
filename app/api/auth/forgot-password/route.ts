import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { emailSchema } from '@/app/lib/validators'
import { generateToken } from '@/app/lib/crypto'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const body = await req.json()
		const { email } = body

		// Validate email
		const result = emailSchema.safeParse(email)
		if (!result.success) {
			return json(false, 'Invalid email address', undefined, { email: result.error.errors[0].message }, 400)
		}

		const emailStr = result.data

		// Find user
		const user = await User.findOne({ email: emailStr })
		if (!user) {
			// Don't reveal if email exists or not for security
			return json(true, 'If an account exists with this email, a password reset link has been sent.')
		}

		// Generate reset token
		const resetToken = generateToken()
		const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

		// Save reset token to user (you may need to add these fields to User model)
		// For now, we'll use the verificationToken field temporarily
		user.verificationToken = resetToken
		await user.save()

		// In a real app, send email with reset link
		// For now, we'll just return success
		// The reset link would be: /auth/reset-password?token=${resetToken}&email=${emailStr}
		
		console.log(`Password reset token for ${emailStr}: ${resetToken}`)
		console.log(`Reset link: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(emailStr)}`)

		return json(true, 'If an account exists with this email, a password reset link has been sent.')
	} catch (err: any) {
		console.error('Forgot password error:', err)
		return json(false, 'Failed to process request', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

