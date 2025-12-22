import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { auth } from '@/app/lib/auth'
import { isAdminAsync, getAdminEmailsList } from '@/app/lib/roles'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

// Get all users (admins can see all, regular admins can only see non-admin users)
export async function GET(req: NextRequest) {
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

		const currentUserEmail = session.user?.email?.toLowerCase()
		const allowList = getAdminEmailsList()
		const isPrimaryAdmin = currentUserEmail && allowList.includes(currentUserEmail)

		// Only show admins (ADMIN and CADMIN roles) and verified users
		const filter = { 
			role: { $in: ['ADMIN', 'CADMIN'] },
			emailVerified: true 
		}

		const users = await User.find(filter)
			.select('name email role emailVerified createdAt')
			.sort({ createdAt: -1 })
			.lean()

		return json(true, 'Users fetched', users)
	} catch (err: any) {
		console.error('GET /api/admin/users error', err)
		return json(false, 'Failed to fetch users', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

// Grant or revoke admin access
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

		const currentUserEmail = session.user?.email?.toLowerCase()
		const allowList = getAdminEmailsList()
		
		// Check if user is in ADMIN_EMAILS
		let isPrimaryAdmin = currentUserEmail && allowList.includes(currentUserEmail)
		
		// Fallback: If ADMIN_EMAILS is empty or user has ADMIN role (not CADMIN), allow them to manage
		// This helps if ADMIN_EMAILS wasn't set when user signed up
		if (!isPrimaryAdmin) {
			const currentUser = await User.findOne({ email: currentUserEmail }).lean()
			if (currentUser && !Array.isArray(currentUser)) {
				const userRole = (currentUser as any).role
				// Only ADMIN role (not CADMIN) can manage other admins
				if (userRole === 'ADMIN') {
					// If ADMIN_EMAILS is empty, treat all database admins as primary
					if (allowList.length === 0) {
						isPrimaryAdmin = true
						console.log('[ADMIN USERS] Fallback: ADMIN_EMAILS empty, treating database admin as primary')
					} else {
						// If ADMIN_EMAILS is set but user not in it, check if they're the first admin
						const adminCount = await User.countDocuments({ role: 'ADMIN' })
						if (adminCount === 1) {
							isPrimaryAdmin = true
							console.log('[ADMIN USERS] Fallback: User is the only admin, treating as primary')
						}
					}
				}
			}
		}
		
		console.log('[ADMIN USERS POST] Primary admin check:', {
			currentUserEmail,
			allowList,
			isPrimaryAdmin,
			ADMIN_EMAILS: process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '(not set)'
		})

		// Only primary admins can grant/revoke admin access
		if (!isPrimaryAdmin) {
			console.log('[ADMIN USERS] Access denied - not primary admin')
			return json(false, 'Only primary admins can manage admin access', undefined, undefined, 403)
		}

		const body = await req.json()
		const { email, action } = body

		if (!email || typeof email !== 'string') {
			return json(false, 'Email is required', undefined, { email: 'Email is required' }, 400)
		}

		if (action !== 'grant' && action !== 'revoke') {
			return json(false, 'Invalid action. Use "grant" or "revoke"', undefined, { action: 'Invalid action' }, 400)
		}

		const targetEmail = email.toLowerCase().trim()

		const user = await User.findOne({ email: targetEmail })
		if (!user) {
			return json(false, 'User not found', undefined, { email: 'User not found' }, 404)
		}

		// Only allow granting access to verified users
		if (action === 'grant' && !(user as any).emailVerified) {
			return json(false, 'User email is not verified. Please verify the email first.', undefined, { email: 'Email not verified' }, 400)
		}

		// Prevent revoking admin access from primary admins (ADMIN role or in ADMIN_EMAILS)
		if (action === 'revoke') {
			if (allowList.includes(targetEmail)) {
				return json(false, 'Cannot revoke admin access from primary admin', undefined, undefined, 400)
			}
			if ((user as any).role === 'ADMIN') {
				return json(false, 'Cannot revoke admin access from primary admin (ADMIN role)', undefined, undefined, 400)
			}
		}

		// Update user role: grant creates CADMIN (sub-admin), revoke makes them USER
		user.role = action === 'grant' ? 'CADMIN' : 'USER'
		await user.save()

		return json(true, `Admin access ${action === 'grant' ? 'granted' : 'revoked'} successfully`, {
			email: targetEmail,
			role: user.role
		})
	} catch (err: any) {
		console.error('POST /api/admin/users error', err)
		return json(false, 'Failed to update user role', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

