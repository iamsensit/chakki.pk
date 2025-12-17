import { NextRequest, NextResponse } from 'next/server'
import { jazzcashCreateSchema, jazzcashUpdateSchema } from '@/app/lib/validators'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
	return NextResponse.json({ success, message, data, errors }, { status })
}

// In real-world, this would integrate with JazzCash APIs. Here we simulate instructions.
export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const parsed = jazzcashCreateSchema.safeParse(body)
		if (!parsed.success) return json(false, 'Invalid body', undefined, parsed.error.flatten(), 400)
		const instructionId = crypto.randomUUID()
		const instructions = {
			id: instructionId,
			account: 'JazzCash 03XX-XXXXXXX',
			amount: parsed.data.amount,
			message: 'Please send the exact amount and reply with reference number.'
		}
		// Optionally persist or link to order via metadata table; we keep it ephemeral here
		return json(true, 'Payment instruction created', instructions, undefined, 201)
	} catch (err) {
		console.error('POST /api/payments/jazzcash error', err)
		return json(false, 'Failed to create payment instruction', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export async function PUT(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const id = url.searchParams.get('id')
		if (!id) return json(false, 'id is required', undefined, undefined, 400)
		const body = await req.json()
		const parsed = jazzcashUpdateSchema.safeParse(body)
		if (!parsed.success) return json(false, 'Invalid body', undefined, parsed.error.flatten(), 400)
		// Simulate update by logging
		console.log('JazzCash payment updated', { id, status: parsed.data.status })
		return json(true, 'Payment status updated', { id, status: parsed.data.status })
	} catch (err) {
		console.error('PUT /api/payments/jazzcash error', err)
		return json(false, 'Failed to update payment', undefined, { error: 'SERVER_ERROR' }, 500)
	}
}

export const dynamic = 'force-dynamic'
