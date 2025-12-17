import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST(req: NextRequest) {
	await connectToDatabase()
	const session = await auth()
	if (!session?.user?.email) return json(false, 'Unauthorized', undefined, undefined, 401)
	const { token } = await req.json()
	if (!token) return json(false, 'Token required', undefined, undefined, 400)
	const user = await User.findOne({ email: session.user.email })
	if (!user) return json(false, 'User not found', undefined, undefined, 404)
	if (user.verificationToken !== token) return json(false, 'Invalid token', undefined, undefined, 400)
	user.emailVerified = true
	user.verificationToken = ''
	await user.save()
	return json(true, 'Email verified')
}

export const dynamic = 'force-dynamic'
