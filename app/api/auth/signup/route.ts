import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { signupSchema } from '@/app/lib/validators'
import { hashPassword } from '@/app/lib/crypto'

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

		// Create new user
		const passwordHash = await hashPassword(password)
		const user = await User.create({
			name,
			email,
			passwordHash
		})

		return json(true, 'Account created successfully', { userId: String(user._id) })
	} catch (err: any) {
		console.error('Signup error:', err)
		if (err.code === 11000) {
			return json(false, 'Email already registered', undefined, { email: 'This email is already registered' }, 400)
		}
		return json(false, 'Failed to create account', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

