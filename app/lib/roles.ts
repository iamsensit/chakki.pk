import type { Session } from 'next-auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'

// Helper function to get admin emails from environment variables
// Supports both ADMIN_EMAILS (plural) and ADMIN_EMAIL (singular) for backward compatibility
export function getAdminEmailsList(): string[] {
	const adminEmailsRaw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || ''
	return adminEmailsRaw
		.split(',')
		.map(s => s.trim().toLowerCase())
		.filter(Boolean)
}

// Synchronous version - checks ADMIN_EMAILS env variable only
export function isAdmin(session: Session | null): boolean {
	if (!session?.user?.email) return false
	
	const email = session.user.email.toLowerCase()
	const allowList = getAdminEmailsList()
	
	return allowList.includes(email)
}

// Async version - also checks user role in database
export async function isAdminAsync(session: Session | null): Promise<boolean> {
	if (!session?.user?.email) return false
	
	const email = session.user.email.toLowerCase()
	const allowList = getAdminEmailsList()
	
	if (allowList.includes(email)) return true
	
	// Check user role in database (both ADMIN and CADMIN are considered admins)
	try {
		await connectToDatabase()
		const user = await User.findOne({ email }).lean()
		if (Array.isArray(user)) return false
		const role = (user as any)?.role
		if (role === 'ADMIN' || role === 'CADMIN') return true
	} catch (err) {
		console.error('Error checking admin role:', err)
	}
	
	return false
}
