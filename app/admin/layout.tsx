import { ReactNode } from 'react'
import { auth } from '@/app/lib/auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { notFound, redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: ReactNode }) {
	// Server-side guard for all /admin routes
	const session = await auth()
	if (!session) {
		// Not logged in → send to login
		redirect('/auth/login')
	}
	await connectToDatabase()
	const email = (session as any)?.user?.email
	const user = email ? await User.findOne({ email }).lean() : null

	// Allow admin access if user has ADMIN role OR email is allow‑listed in env ADMIN_EMAILS
	const allowList = (process.env.ADMIN_EMAILS || '')
		.split(',')
		.map(s => s.trim().toLowerCase())
		.filter(Boolean)
	const isAllowListed = email ? allowList.includes(email.toLowerCase()) : false

	// If there are no admins yet, promote the current user automatically (bootstrap)
	const adminsCount = await User.countDocuments({ role: 'ADMIN' })
	if (user && !Array.isArray(user) && adminsCount === 0 && (user as any).role !== 'ADMIN') {
		await User.updateOne({ _id: (user as any)._id }, { $set: { role: 'ADMIN' } })
	}

	// Refresh user after possible promotion
	const effective = user && !Array.isArray(user) ? await User.findById((user as any)._id).lean() : null

	if (!effective || Array.isArray(effective) || ((effective as any).role !== 'ADMIN' && !isAllowListed)) {
		// Logged in but not admin → 404
		notFound()
	}

	// Optionally promote allow‑listed user to ADMIN for persistence
	if (effective && !Array.isArray(effective) && isAllowListed && (effective as any).role !== 'ADMIN') {
		await User.updateOne({ _id: (effective as any)._id }, { $set: { role: 'ADMIN' } })
	}
	return <>{children}</>
}


