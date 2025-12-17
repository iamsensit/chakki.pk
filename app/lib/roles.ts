import type { Session } from 'next-auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'

// Synchronous version - checks ADMIN_EMAILS env variable only
export function isAdmin(session: Session | null): boolean {
	if (!session?.user?.email) return false
	
	const email = session.user.email.toLowerCase()
	
	// Check ADMIN_EMAILS environment variable (comma-separated list)
	const allowList = (process.env.ADMIN_EMAILS || '')
		.split(',')
		.map(s => s.trim().toLowerCase())
		.filter(Boolean)
	
	return allowList.includes(email)
}

// Async version - also checks user role in database
export async function isAdminAsync(session: Session | null): Promise<boolean> {
	if (!session?.user?.email) return false
	
	const email = session.user.email.toLowerCase()
	
	// Check ADMIN_EMAILS environment variable (comma-separated list)
	const allowList = (process.env.ADMIN_EMAILS || '')
		.split(',')
		.map(s => s.trim().toLowerCase())
		.filter(Boolean)
	
	if (allowList.includes(email)) return true
	
	// Check user role in database
	try {
		await connectToDatabase()
		const user = await User.findOne({ email }).lean()
		if (Array.isArray(user)) return false
		if ((user as any)?.role === 'ADMIN') return true
	} catch (err) {
		console.error('Error checking admin role:', err)
	}
	
	return false
}
