import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { hashPassword, verifyPassword } from '@/app/lib/crypto'
import { changePasswordSchema } from '@/app/lib/validators'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST(req: NextRequest) {
	await connectToDatabase()
	const session = await auth()
	if (!session?.user?.email) return json(false, 'Unauthorized', undefined, undefined, 401)
	
	const body = await req.json()
	const parsed = changePasswordSchema.safeParse(body)
	
	if (!parsed.success) {
		const fieldErrors: { currentPassword?: string; newPassword?: string } = {}
		parsed.error.errors.forEach((err) => {
			if (err.path[0] === 'currentPassword') fieldErrors.currentPassword = err.message
			if (err.path[0] === 'newPassword') fieldErrors.newPassword = err.message
		})
		return json(false, 'Validation failed', undefined, fieldErrors, 400)
	}

	const { currentPassword, newPassword } = parsed.data
	const user = await User.findOne({ email: session.user.email })
	if (!user) return json(false, 'User not found', undefined, undefined, 404)
	
	if (user.passwordHash) {
		const ok = await verifyPassword(currentPassword, user.passwordHash)
		if (!ok) {
			return json(false, 'Current password incorrect', undefined, { currentPassword: 'Current password is incorrect' }, 400)
		}
	}
	
	user.passwordHash = await hashPassword(newPassword)
	await user.save()
	return json(true, 'Password updated')
}

export const dynamic = 'force-dynamic'
