import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { generateVerificationCode } from '@/app/lib/crypto'
import { sendEmail } from '@/app/lib/email'
import { renderVerificationEmailTemplate } from '@/app/lib/email-templates'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST() {
	await connectToDatabase()
	const session = await auth()
	if (!session?.user?.email) return json(false, 'Unauthorized', undefined, undefined, 401)
	const token = generateVerificationCode()
	await User.updateOne({ email: session.user.email }, { $set: { verificationToken: token, emailVerified: false } })
	
	const user = await User.findOne({ email: session.user.email }).lean()
	const userName = (user as any)?.name

	const html = renderVerificationEmailTemplate(token, userName)
	const text = `Verify your email for Chakki\n\nYour verification code: ${token}\n\nIf you did not request this, you can ignore this email.`

	const emailResult = await sendEmail({
		to: session.user.email,
		subject: 'Verify your Chakki email',
		text,
		html
	})

	if (!emailResult.success) {
		console.error('Verification email failed', emailResult)
	}

	// Keep returning token for compatibility with existing UI
	return json(true, 'Verification email sent', { token })
}

export const dynamic = 'force-dynamic'
