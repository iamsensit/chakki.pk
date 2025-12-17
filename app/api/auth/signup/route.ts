import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { signupSchema } from '@/app/lib/validators'
import { hashPassword, generateVerificationCode } from '@/app/lib/crypto'
import { sendEmail } from '@/app/lib/email'
import { renderVerificationEmailTemplate, renderWelcomeEmailTemplate } from '@/app/lib/email-templates'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const body = await req.json()
		const parsed = signupSchema.safeParse(body)
		
		if (!parsed.success) {
			return json(false, 'Validation failed', undefined, parsed.error.flatten().fieldErrors, 400)
		}

		const { name, email, password } = parsed.data

		// Check if user already exists
		const existingUser = await User.findOne({ email })
		if (existingUser) {
			return json(false, 'Email already registered', undefined, { email: 'This email is already registered' }, 400)
		}

		// Create new user (unverified) with verification token
		const passwordHash = await hashPassword(password)
		const verificationToken = generateVerificationCode()
		const user = await User.create({
			name,
			email,
			passwordHash,
			emailVerified: false,
			verificationToken
		})

		// Send verification email (best effort)
		const html = renderVerificationEmailTemplate(verificationToken, name)
		const text = `Verify your email for Chakki\n\nYour verification code: ${verificationToken}\n\nIf you did not create this account, you can ignore this email.`
		
		const emailResult = await sendEmail({
			to: email,
			subject: 'Verify your Chakki email',
			text,
			html
		})
		if (!emailResult.success) {
			console.error('Signup verification email failed', emailResult)
		}

		return json(true, 'Account created. Please verify your email to activate your account.', { userId: String(user._id) })
	} catch (err: any) {
		console.error('Signup error:', err)
		if (err.code === 11000) {
			return json(false, 'Email already registered', undefined, { email: 'This email is already registered' }, 400)
		}
		return json(false, 'Failed to create account', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

