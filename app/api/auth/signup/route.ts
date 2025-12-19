import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { signupSchema } from '@/app/lib/validators'
import { hashPassword, generateVerificationCode } from '@/app/lib/crypto'
import { sendEmail } from '@/app/lib/email'
import { renderVerificationEmailTemplate, renderWelcomeEmailTemplate } from '@/app/lib/email-templates'
import { getAdminEmailsList } from '@/app/lib/roles'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST(req: NextRequest) {
	try {
		// Log environment variable availability (for debugging)
		const adminEmailsRaw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || ''
		console.log('[SIGNUP] Environment check:', {
			hasAdminEmails: !!adminEmailsRaw,
			adminEmailsValue: adminEmailsRaw || '(not set)',
			ADMIN_EMAILS: process.env.ADMIN_EMAILS || '(not set)',
			ADMIN_EMAIL: process.env.ADMIN_EMAIL || '(not set)',
			usingVar: process.env.ADMIN_EMAILS ? 'ADMIN_EMAILS' : (process.env.ADMIN_EMAIL ? 'ADMIN_EMAIL' : 'none'),
			allEnvKeys: Object.keys(process.env).filter(k => k.includes('ADMIN'))
		})
		
		await connectToDatabase()
		const body = await req.json()
		const parsed = signupSchema.safeParse(body)
		
		if (!parsed.success) {
			return json(false, 'Validation failed', undefined, parsed.error.flatten().fieldErrors, 400)
		}

		const { name, email, password } = parsed.data

		// Check if email is in ADMIN_EMAILS (or ADMIN_EMAIL for backward compatibility) to assign primary admin role (ADMIN, not CADMIN)
		const allowList = getAdminEmailsList()
		const emailLower = email.toLowerCase().trim()
		const isPrimaryAdminEmail = allowList.length > 0 && allowList.includes(emailLower)
		
		// Enhanced logging for debugging
		console.log('[SIGNUP] ========== ADMIN ROLE CHECK ==========')
		console.log('[SIGNUP] Using env var:', process.env.ADMIN_EMAILS ? 'ADMIN_EMAILS' : (process.env.ADMIN_EMAIL ? 'ADMIN_EMAIL' : 'none'))
		console.log('[SIGNUP] Raw admin emails from env:', adminEmailsRaw)
		console.log('[SIGNUP] Admin emails type:', typeof adminEmailsRaw)
		console.log('[SIGNUP] Admin emails length:', adminEmailsRaw.length)
		console.log('[SIGNUP] Processed allowList:', allowList)
		console.log('[SIGNUP] AllowList length:', allowList.length)
		console.log('[SIGNUP] User email (lowercase):', emailLower)
		console.log('[SIGNUP] Is primary admin email?', isPrimaryAdminEmail)
		console.log('[SIGNUP] Email match check:', {
			emailInList: allowList.includes(emailLower),
			emailLower,
			allowList
		})
		console.log('[SIGNUP] =======================================')

		// Check if user already exists
		const existingUser = await User.findOne({ email })
		if (existingUser) {
			// If user exists but should be admin, update their role
			if (isPrimaryAdminEmail && (existingUser as any).role !== 'ADMIN') {
				console.log('[SIGNUP] Updating existing user to ADMIN role:', email)
				await User.updateOne({ email }, { $set: { role: 'ADMIN' } })
				return json(false, 'Email already registered. Your account has been upgraded to admin. Please log in.', undefined, { email: 'Email already registered' }, 400)
			}
			
			return json(false, 'Email already registered', undefined, { email: 'This email is already registered' }, 400)
		}

		// Create new user (unverified) with verification token
		const passwordHash = await hashPassword(password)
		const verificationToken = generateVerificationCode()
		const userRole = isPrimaryAdminEmail ? 'ADMIN' : 'USER'
		
		console.log('[SIGNUP] Creating user with role:', userRole, '(isPrimaryAdminEmail:', isPrimaryAdminEmail, ')')
		
		const user = await User.create({
			name,
			email,
			passwordHash,
			emailVerified: false,
			verificationToken,
			role: userRole
		})
		
		// Verify the role was saved correctly by fetching from database
		const savedUser = await User.findById(user._id).lean()
		const savedRole = (savedUser as any)?.role
		
		console.log('[SIGNUP] User created:', {
			_id: user._id,
			email: user.email,
			role: (user as any).role,
			savedRole: savedRole,
			roleMatch: (user as any).role === savedRole
		})
		
		if (isPrimaryAdminEmail && savedRole !== 'ADMIN') {
			console.error('[SIGNUP] ERROR: User should be ADMIN but role is:', savedRole)
			// Try to fix it
			await User.updateOne({ _id: user._id }, { $set: { role: 'ADMIN' } })
			const fixedUser = await User.findById(user._id).lean()
			const fixedRole = Array.isArray(fixedUser) ? null : (fixedUser as any)?.role
			console.log('[SIGNUP] Attempted to fix role. New role:', fixedRole)
		}

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
			// If email sending failed, still create the account but warn the user
			// They can request a new verification code later
			return json(true, 'Account created, but verification email could not be sent. Please check your email address and try resending the verification code.', { 
				userId: String(user._id),
				emailSent: false,
				warning: 'Email delivery failed. Please verify your email address is correct.'
			})
		}

		return json(true, 'Account created. Please verify your email to activate your account.', { 
			userId: String(user._id),
			emailSent: true
		})
	} catch (err: any) {
		console.error('Signup error:', err)
		if (err.code === 11000) {
			return json(false, 'Email already registered', undefined, { email: 'This email is already registered' }, 400)
		}
		return json(false, 'Failed to create account', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

