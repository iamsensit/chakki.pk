import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import { JournalEntry } from '@/models/Journal'
import Settings from '@/models/Settings'
import POSale from '@/models/POSale'
import Order from '@/models/Order'
import Expense from '@/models/Expense'
import Product from '@/models/Product'
import { auth } from '@/app/lib/auth'

function json(success: boolean, message: string, data?: any, errors?: any, status = 200) {
  return NextResponse.json({ success, message, data, errors }, { status })
}

export async function GET() {
  try {
    await connectToDatabase()
    const session = await auth()
    if (!session) return json(false, 'Unauthorized', undefined, undefined, 401)

    // Get settings to find account IDs
    const settings = await Settings.findOne().lean()
    const settingsDoc = Array.isArray(settings) ? null : settings
    if (!settingsDoc || !settingsDoc.defaultAccounts) {
      return json(true, 'Dashboard data', {
        sales: { total: 0, thisMonth: 0, today: 0 },
        cash: { cashInHand: 0, bankBalance: 0, receivables: 0, payables: 0 },
        summary: { profitLoss: { total: 0, thisMonth: 0, today: 0 } }
      })
    }

    const { cashAccountId, bankAccountId, salesAccountId, arAccountId } = (settingsDoc as any).defaultAccounts || {}
    
    // Find Accounts Payable account by code (2000)
    const apAccount = await (await import('@/models/Account')).default.findOne({ code: '2000' }).lean()
    const apAccountId = apAccount ? (apAccount as any)._id : null

    // Date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Calculate Sales (Revenue)
    // From POS sales
    const posSalesTotal = await POSale.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ])
    const posSalesThisMonth = await POSale.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ])
    const posSalesToday = await POSale.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ])

    // From Orders (paid orders only)
    const ordersTotal = await Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
    const ordersThisMonth = await Order.aggregate([
      { $match: { paymentStatus: 'PAID', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
    const ordersToday = await Order.aggregate([
      { $match: { paymentStatus: 'PAID', createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])

    // From Journal Entries (Sales Revenue account)
    let journalSalesTotal = 0
    let journalSalesThisMonth = 0
    let journalSalesToday = 0
    if (salesAccountId) {
      const salesJournalTotal = await JournalEntry.aggregate([
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': salesAccountId } },
        { $group: { _id: null, total: { $sum: '$lines.credit' } } }
      ])
      const salesJournalThisMonth = await JournalEntry.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': salesAccountId } },
        { $group: { _id: null, total: { $sum: '$lines.credit' } } }
      ])
      const salesJournalToday = await JournalEntry.aggregate([
        { $match: { date: { $gte: todayStart } } },
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': salesAccountId } },
        { $group: { _id: null, total: { $sum: '$lines.credit' } } }
      ])
      journalSalesTotal = salesJournalTotal[0]?.total || 0
      journalSalesThisMonth = salesJournalThisMonth[0]?.total || 0
      journalSalesToday = salesJournalToday[0]?.total || 0
    }

    const salesTotal = (posSalesTotal[0]?.total || 0) + (ordersTotal[0]?.total || 0) + journalSalesTotal
    const salesThisMonth = (posSalesThisMonth[0]?.total || 0) + (ordersThisMonth[0]?.total || 0) + journalSalesThisMonth
    const salesToday = (posSalesToday[0]?.total || 0) + (ordersToday[0]?.total || 0) + journalSalesToday

    // Calculate Cash in Hand (Cash Account balance)
    let cashInHand = 0
    if (cashAccountId) {
      const cashBalance = await JournalEntry.aggregate([
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': cashAccountId } },
        { $group: { _id: null, debit: { $sum: '$lines.debit' }, credit: { $sum: '$lines.credit' } } }
      ])
      if (cashBalance[0]) {
        cashInHand = (cashBalance[0].debit || 0) - (cashBalance[0].credit || 0)
      }
    }

    // Calculate Bank Balance
    let bankBalance = 0
    if (bankAccountId) {
      const bankBal = await JournalEntry.aggregate([
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': bankAccountId } },
        { $group: { _id: null, debit: { $sum: '$lines.debit' }, credit: { $sum: '$lines.credit' } } }
      ])
      if (bankBal[0]) {
        bankBalance = (bankBal[0].debit || 0) - (bankBal[0].credit || 0)
      }
    }

    // Calculate Receivables (AR Account balance)
    let receivables = 0
    if (arAccountId) {
      const arBal = await JournalEntry.aggregate([
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': arAccountId } },
        { $group: { _id: null, debit: { $sum: '$lines.debit' }, credit: { $sum: '$lines.credit' } } }
      ])
      if (arBal[0]) {
        receivables = (arBal[0].debit || 0) - (arBal[0].credit || 0)
      }
    }

    // Calculate Payables (AP Account balance)
    let payables = 0
    if (apAccountId) {
      const apBal = await JournalEntry.aggregate([
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': apAccountId } },
        { $group: { _id: null, debit: { $sum: '$lines.debit' }, credit: { $sum: '$lines.credit' } } }
      ])
      if (apBal[0]) {
        payables = (apBal[0].credit || 0) - (apBal[0].debit || 0) // Payables are liabilities (credit - debit)
      }
    }

    // Calculate Expenses
    const expensesTotal = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    const expensesThisMonth = await Expense.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    const expensesToday = await Expense.aggregate([
      { $match: { date: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])

    // Also get expenses from journal entries (Expense accounts)
    const expenseAccounts = await (await import('@/models/Account')).default.find({ type: 'EXPENSE' }).lean()
    const expenseAccountIds = expenseAccounts.map((a: any) => a._id).filter(Boolean)
    
    let journalExpensesTotal = 0
    let journalExpensesThisMonth = 0
    let journalExpensesToday = 0
    if (expenseAccountIds.length > 0) {
      const expJournalTotal = await JournalEntry.aggregate([
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': { $in: expenseAccountIds } } },
        { $group: { _id: null, total: { $sum: '$lines.debit' } } }
      ])
      const expJournalThisMonth = await JournalEntry.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': { $in: expenseAccountIds } } },
        { $group: { _id: null, total: { $sum: '$lines.debit' } } }
      ])
      const expJournalToday = await JournalEntry.aggregate([
        { $match: { date: { $gte: todayStart } } },
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': { $in: expenseAccountIds } } },
        { $group: { _id: null, total: { $sum: '$lines.debit' } } }
      ])
      journalExpensesTotal = expJournalTotal[0]?.total || 0
      journalExpensesThisMonth = expJournalThisMonth[0]?.total || 0
      journalExpensesToday = expJournalToday[0]?.total || 0
    }

    const expensesTotalAmount = (expensesTotal[0]?.total || 0) + journalExpensesTotal
    const expensesThisMonthAmount = (expensesThisMonth[0]?.total || 0) + journalExpensesThisMonth
    const expensesTodayAmount = (expensesToday[0]?.total || 0) + journalExpensesToday

    // Calculate Profit/Loss (Revenue - Expenses)
    const profitLossTotal = salesTotal - expensesTotalAmount
    const profitLossThisMonth = salesThisMonth - expensesThisMonthAmount
    const profitLossToday = salesToday - expensesTodayAmount

    // Calculate Inventory Investment (Stock Value)
    // Get all products with variants and calculate: costPerKg * unitWeight * stockQty
    // If costPerKg doesn't exist or is 0, estimate as 70% of pricePerKg
    const products = await Product.find({}).lean()
    let inventoryInvestment = 0
    let debugInfo: any[] = []
    
    for (const product of products) {
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          const stockQty = Number(variant.stockQty) || 0
          const unitWeight = Number(variant.unitWeight) || 0
          const pricePerKg = Number(variant.pricePerKg) || 0
          const costPerKgRaw = Number((variant as any).costPerKg) || 0
          
          // Use costPerKg if it's set and > 0, otherwise estimate as 70% of selling price
          const costPerKg = (costPerKgRaw > 0) ? costPerKgRaw : (pricePerKg > 0 ? pricePerKg * 0.7 : 0)
          
          // Calculate cost: costPerKg * unitWeight * stockQty
          // unitWeight is stored in base unit (kg for weight, l for volume, or as-is for pcs/pack)
          if (stockQty > 0 && unitWeight > 0 && costPerKg > 0) {
            const variantCost = costPerKg * unitWeight * stockQty
            inventoryInvestment += variantCost
            debugInfo.push({
              product: (product as any).title || 'Unknown',
              sku: variant.sku || 'N/A',
              stockQty,
              unitWeight,
              pricePerKg,
              costPerKgRaw,
              costPerKg,
              variantCost
            })
          }
        }
      }
    }
    
    // Log debug info in development
    if (process.env.NODE_ENV === 'development' && debugInfo.length > 0) {
      console.log('Inventory Investment Calculation:', {
        totalProducts: products.length,
        variantsCalculated: debugInfo.length,
        totalInvestment: inventoryInvestment,
        sample: debugInfo.slice(0, 3)
      })
    }

    // Also get inventory value from Inventory Account in journal entries
    const inventoryAccountId = (settingsDoc as any)?.defaultAccounts?.inventoryAccountId
    let inventoryAccountValue = 0
    if (inventoryAccountId) {
      const invBal = await JournalEntry.aggregate([
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': inventoryAccountId } },
        { $group: { _id: null, debit: { $sum: '$lines.debit' }, credit: { $sum: '$lines.credit' } } }
      ])
      if (invBal[0]) {
        inventoryAccountValue = (invBal[0].debit || 0) - (invBal[0].credit || 0)
      }
    }

    // Use the higher of product-based calculation or journal-based calculation
    const totalInventoryInvestment = Math.max(inventoryInvestment, inventoryAccountValue)

    return json(true, 'Dashboard data', {
      sales: {
        total: Math.round(salesTotal),
        thisMonth: Math.round(salesThisMonth),
        today: Math.round(salesToday)
      },
      cash: {
        cashInHand: Math.round(cashInHand),
        bankBalance: Math.round(bankBalance),
        receivables: Math.round(receivables),
        payables: Math.round(payables),
        inventoryInvestment: Math.round(totalInventoryInvestment)
      },
      summary: {
        profitLoss: {
          total: Math.round(profitLossTotal),
          thisMonth: Math.round(profitLossThisMonth),
          today: Math.round(profitLossToday)
        }
      }
    })
  } catch (err: any) {
    console.error('GET /api/accounts/dashboard error', err)
    return json(false, 'Failed to fetch dashboard data', undefined, { error: 'SERVER_ERROR' }, 500)
  }
}

export const dynamic = 'force-dynamic'

