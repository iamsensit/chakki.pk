import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import { auth } from '@/app/lib/auth'
import POSale from '@/models/POSale'
import Product from '@/models/Product'
import Settings from '@/models/Settings'
import { JournalEntry } from '@/models/Journal'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
  return NextResponse.json({ success, message, data, errors }, { status })
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase()
    const session = await auth()
    if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)
    const body = await req.json()
    const { items, paymentMethod } = body as { items: Array<{ productId: string; variantId?: string; title: string; quantity: number; unitPrice: number }>, paymentMethod: 'CASH' | 'CARD' }
    if (!Array.isArray(items) || !items.length) return json(false, 'No items', undefined, { error: 'BAD_REQUEST' }, 400)

    const subtotal = items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0)
    const total = subtotal

    // Deduct stock
    for (const it of items) {
      // Validate productId exists and is not "undefined" string
      if (!it.productId || it.productId === 'undefined' || it.productId === 'null') {
        console.error('Invalid or missing productId in item:', it)
        continue
      }
      
      // Validate productId is a valid ObjectId format (24 hex characters)
      if (!/^[0-9a-fA-F]{24}$/.test(it.productId)) {
        console.error('Invalid productId format:', it.productId)
        continue
      }
      
      try {
        if (it.variantId) {
          // Validate variantId format if provided
          if (!/^[0-9a-fA-F]{24}$/.test(it.variantId)) {
            console.error('Invalid variantId format:', it.variantId)
            continue
          }
          // Update variant stock
          await Product.updateOne(
            { _id: it.productId, 'variants._id': it.variantId },
            { $inc: { 'variants.$.stockQty': -it.quantity } }
          )
        } else {
          // Update product-level stock if no variant
          // Note: This assumes the product has a stockQty field at the product level
          // If your schema doesn't have this, you may need to update the first variant or skip this
          await Product.updateOne(
            { _id: it.productId },
            { $inc: { stockQty: -it.quantity } }
          ).catch((err) => {
            // If stockQty doesn't exist at product level, try updating first variant
            console.warn('Product-level stock update failed, trying variant update:', err)
            return Product.updateOne(
              { _id: it.productId },
              { $inc: { 'variants.0.stockQty': -it.quantity } }
            )
          })
        }
      } catch (err) {
        console.error(`Failed to update stock for product ${it.productId}:`, err)
        // Continue with other items even if one fails
      }
    }

    // Create receipt
    const receiptNumber = 'POS-' + Date.now().toString(36).toUpperCase()
    const sale = await POSale.create({ receiptNumber, paymentMethod, items, subtotal, total })

    // Post accounting journal (Revenue receipt)
    try {
      const settings = await Settings.findOne().lean()
      const settingsDoc = Array.isArray(settings) ? null : settings
      const accountDr = paymentMethod === 'CASH' ? (settingsDoc as any)?.defaultAccounts?.cashAccountId : (settingsDoc as any)?.defaultAccounts?.bankAccountId
      const accountCr = (settingsDoc as any)?.defaultAccounts?.salesAccountId
      if (accountDr && accountCr) {
        await JournalEntry.create({
          date: new Date(),
          source: 'POS',
          ref: receiptNumber,
          notes: `POS ${paymentMethod} sale`,
          lines: [
            { accountId: accountDr, description: 'pos sale receipt', debit: total, credit: 0 },
            { accountId: accountCr, description: 'sale revenue', debit: 0, credit: total },
          ],
        })
      }
    } catch (e) {
      console.error('POS journal post failed', e)
    }

    return json(true, 'POS sale recorded', { sale })
  } catch (err) {
    console.error('POST /api/pos/sale error', err)
    return json(false, 'Failed to record sale', undefined, { error: 'SERVER_ERROR' }, 500)
  }
}

export const dynamic = 'force-dynamic'


