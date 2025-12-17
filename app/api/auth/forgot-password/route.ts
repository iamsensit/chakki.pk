import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { emailSchema } from '@/app/lib/validators'
import { generateToken } from '@/app/lib/crypto'
import { sendEmail } from '@/app/lib/email'
import { renderPasswordResetEmailTemplate } from '@/app/lib/email-templates'
import { renderEmailTemplate } from '@/app/lib/email'

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

		// Save reset token to user (you may need to add these fields to User model)
		// For now, we'll use the verificationToken field temporarily
		user.verificationToken = resetToken
		await user.save()

		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
		const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(emailStr)}`

		const html = renderPasswordResetEmailTemplate(resetLink, user.name)
		const text = `Reset your password\n\nWe received a request to reset your Chakki account password.\n\nReset link: ${resetLink}\n\nIf you did not request this, you can ignore this email.`

		const emailResult = await sendEmail({
			to: emailStr,
			subject: 'Reset your Chakki password',
			text,
			html
		})

		if (!emailResult.success) {
			console.error('Forgot password email failed', emailResult)
		}

		return json(true, 'If an account exists with this email, a password reset link has been sent.')
	} catch (err: any) {
		console.error('Forgot password error:', err)
		return json(false, 'Failed to process request', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

