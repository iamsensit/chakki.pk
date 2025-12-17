import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET() {
	await connectToDatabase()
	const session = await auth()
	if (!session?.user?.email) return json(false, 'Unauthorized', undefined, undefined, 401)
	const user = await User.findOne({ email: session.user.email }).lean()
	if (Array.isArray(user)) return json(false, 'Invalid user data', undefined, undefined, 500)
	
	// Check if user is admin
	const allowList = (process.env.ADMIN_EMAILS || '')
		.split(',')
		.map(s => s.trim().toLowerCase())
		.filter(Boolean)
	const email = session.user.email.toLowerCase()
	const isAdmin = (user as any)?.role === 'ADMIN' || allowList.includes(email)
	
	return json(true, 'Profile', { 
		name: (user as any)?.name ?? '', 
		email: (user as any)?.email ?? '', 
		emailVerified: (user as any)?.emailVerified ?? false,
		isAdmin 
	})
}

export async function PUT(req: NextRequest) {
	await connectToDatabase()
	const session = await auth()
	if (!session?.user?.email) return json(false, 'Unauthorized', undefined, undefined, 401)
	const body = await req.json()
	const name = typeof body.name === 'string' ? body.name : undefined
	if (!name) return json(false, 'Invalid name', undefined, undefined, 400)
	await User.updateOne({ email: session.user.email }, { $set: { name } })
	return json(true, 'Profile updated')
}

export const dynamic = 'force-dynamic'
