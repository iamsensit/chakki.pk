import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import Cart from '@/models/Cart'
import UserDeliveryLocation from '@/models/UserDeliveryLocation'
import { verifyPassword } from '@/app/lib/crypto'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET() {
	await connectToDatabase()
	const session = await auth()
	if (!session?.user?.email) return json(false, 'Unauthorized', undefined, undefined, 401)
	const user = await User.findOne({ email: session.user.email }).lean()
	if (Array.isArray(user)) return json(false, 'Invalid user data', undefined, undefined, 500)
	
	// Check if user is admin (ADMIN or CADMIN role)
	const { getAdminEmailsList } = await import('@/app/lib/roles')
	const allowList = getAdminEmailsList()
	const email = session.user.email.toLowerCase()
	const userRole = (user as any)?.role
	const isAdmin = userRole === 'ADMIN' || userRole === 'CADMIN' || allowList.includes(email)
	
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

export async function DELETE(req: NextRequest) {
	await connectToDatabase()
	const session = await auth()
	if (!session?.user?.email) return json(false, 'Unauthorized', undefined, undefined, 401)
	
	const body = await req.json()
	const password = typeof body.password === 'string' ? body.password : undefined
	
	if (!password) {
		return json(false, 'Password is required to delete account', undefined, { password: 'Password is required' }, 400)
	}
	
	const email = session.user.email
	const user = await User.findOne({ email })
	if (!user) return json(false, 'User not found', undefined, undefined, 404)
	
	// Verify password
	if (user.passwordHash) {
		const ok = await verifyPassword(password, user.passwordHash)
		if (!ok) {
			return json(false, 'Incorrect password', undefined, { password: 'Password is incorrect' }, 400)
		}
	} else {
		// User has no password (e.g., Google sign-in only)
		return json(false, 'Cannot delete account without password verification', undefined, undefined, 400)
	}

	await Promise.all([
		User.deleteOne({ email }),
		Cart.deleteOne({ userId: email }),
		UserDeliveryLocation.deleteMany({ userId: email })
	])

	return json(true, 'Account deleted')
}

export const dynamic = 'force-dynamic'
