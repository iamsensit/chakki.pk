import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import POSale from '@/models/POSale'
import { auth } from '@/app/lib/auth'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET(req: NextRequest) {
	try {
		await connectToDatabase()
		const session = await auth()
		if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)

		const sales = await POSale.find({}).sort({ createdAt: -1 }).limit(1000).lean()
		
		return json(true, 'POS sales fetched', sales)
	} catch (err: any) {
		console.error('GET /api/pos/sales error', err)
		return json(false, 'Failed to fetch POS sales', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'

