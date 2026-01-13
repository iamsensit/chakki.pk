import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import Request from '@/models/Request'
import { connectToDatabase } from '@/app/lib/mongodb'

function json(success: boolean, message: string, data?: any, status = 200) {
	return NextResponse.json({ success, message, data }, { status })
}

// PATCH - Update request status (admin only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		await connectToDatabase()
		const session = await auth()
		
		if (!session?.user?.email) {
			return json(false, 'Unauthorized', undefined, 401)
		}
		
		// Check if user is admin
		const User = (await import('@/models/User')).default
		const user = await User.findOne({ email: session.user.email }).lean()
		if (!user || Array.isArray(user)) {
			return json(false, 'Admin access required', undefined, 403)
		}
		const userRole = (user as any)?.role
		if (userRole !== 'ADMIN' && userRole !== 'admin') {
			return json(false, 'Admin access required', undefined, 403)
		}
		
		const { id } = params
		const body = await req.json()
		const { status, adminNotes } = body
		
		if (status && !['pending', 'approved', 'rejected'].includes(status)) {
			return json(false, 'Invalid status', undefined, 400)
		}
		
		const updateData: any = {}
		if (status) updateData.status = status
		if (adminNotes !== undefined) updateData.adminNotes = adminNotes
		
		const request = await Request.findByIdAndUpdate(id, updateData, { new: true }).lean()
		
		if (!request) {
			return json(false, 'Request not found', undefined, 404)
		}
		
		return json(true, 'Request updated', { request })
	} catch (err: any) {
		console.error('PATCH /api/requests/[id] error:', err)
		return json(false, 'Failed to update request', undefined, 500)
	}
}

export const dynamic = 'force-dynamic'

