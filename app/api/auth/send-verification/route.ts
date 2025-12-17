import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { generateVerificationCode } from '@/app/lib/crypto'
import { sendEmail } from '@/app/lib/email'
import { renderVerificationEmailTemplate } from '@/app/lib/email-templates'

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
		if (!user) return json(true, 'If this email exists, a verification link has been sent.')
		if (user.emailVerified) return json(true, 'Email is already verified.')

		const token = generateVerificationCode()
		user.verificationToken = token
		await user.save()

		const userData = await User.findOne({ email: emailStr }).lean()
		const userName = (userData as any)?.name
		
		const html = renderVerificationEmailTemplate(token, userName)
		const text = `Verify your email for Chakki\n\nYour verification code: ${token}\n\nIf you did not request this, you can ignore this email.`

		const emailResult = await sendEmail({
			to: emailStr,
			subject: 'Verify your Chakki email',
			text,
			html
		})

		if (!emailResult.success) {
			console.error('Send verification email failed', emailResult)
		}

		return json(true, 'Verification email sent if the account exists.')
	} catch (err: any) {
		console.error('Send verification error:', err)
		return json(false, 'Failed to send verification email', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

