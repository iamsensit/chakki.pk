import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { auth } from '@/app/lib/auth'
import { isAdminAsync, getAdminEmailsList } from '@/app/lib/roles'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

// Utility endpoint to promote a user to ADMIN if they match ADMIN_EMAILS
export async function POST(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		if (!session) {
			return json(false, 'Unauthorized', undefined, undefined, 401)
		}

		const isAdmin = await isAdminAsync(session)
		if (!isAdmin) {
			return json(false, 'Admin access required', undefined, undefined, 403)
		}

		const body = await req.json()
		const { email } = body

		if (!email || typeof email !== 'string') {
			return json(false, 'Email is required', undefined, { email: 'Email is required' }, 400)
		}

		const emailLower = email.toLowerCase().trim()
		const allowList = getAdminEmailsList()

		const user = await User.findOne({ email: emailLower })
		if (!user) {
			return json(false, 'User not found', undefined, { email: 'User not found' }, 404)
		}

		// Check if email matches ADMIN_EMAILS
		if (!allowList.includes(emailLower)) {
			return json(false, 'Email does not match ADMIN_EMAILS', undefined, { email: 'Email is not in ADMIN_EMAILS' }, 400)
		}

		// Promote to ADMIN
		if ((user as any).role !== 'ADMIN') {
			await User.updateOne({ email: emailLower }, { $set: { role: 'ADMIN' } })
			return json(true, 'User promoted to ADMIN successfully', {
				email: emailLower,
				role: 'ADMIN'
			})
		} else {
			return json(true, 'User is already ADMIN', {
				email: emailLower,
				role: 'ADMIN'
			})
		}
	} catch (err: any) {
		console.error('POST /api/admin/promote error', err)
		return json(false, 'Failed to promote user', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

