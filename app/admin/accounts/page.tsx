"use client"

import useSWR from 'swr'
import Link from 'next/link'
import { TrendingUp, Wallet, DollarSign, ArrowUpCircle, ArrowDownCircle, Receipt, Building2, FileText, Settings } from 'lucide-react'
import { formatCurrencyPKR } from '@/app/lib/price'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AccountsHome() {
  const { data, error, isLoading } = useSWR('/api/accounts/dashboard', fetcher)
  const dashboard = data?.data || {
    sales: { total: 0, thisMonth: 0, today: 0 },
    cash: { cashInHand: 0, bankBalance: 0, receivables: 0, payables: 0 },
    summary: { profitLoss: { total: 0, thisMonth: 0, today: 0 } }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Main Accounting</h1>
        <div className="grid gap-4">
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Main Accounting</h1>

      {/* Sales Section */}
      <div className="rounded-md border bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-brand-accent" />
          <h2 className="text-lg font-semibold">Sales</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm text-slate-600 mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrencyPKR(dashboard.sales.total)}</div>
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm text-slate-600 mb-1">This Month</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrencyPKR(dashboard.sales.thisMonth)}</div>
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm text-slate-600 mb-1">Today</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrencyPKR(dashboard.sales.today)}</div>
          </div>
        </div>
      </div>

      {/* Cash Section */}
      <div className="rounded-md border bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-brand-accent" />
          <h2 className="text-lg font-semibold">Cash</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-sm text-slate-600">Cash in Hand</div>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrencyPKR(dashboard.cash.cashInHand || 0)}</div>
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-slate-600">Bank Balance</div>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrencyPKR(dashboard.cash.bankBalance || 0)}</div>
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpCircle className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-slate-600">Receivables</div>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrencyPKR(dashboard.cash.receivables || 0)}</div>
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              <div className="text-sm text-slate-600">Payables</div>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrencyPKR(dashboard.cash.payables || 0)}</div>
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="text-sm text-slate-600">Stock Investment</div>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrencyPKR(dashboard.cash.inventoryInvestment || 0)}</div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="rounded-md border bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-brand-accent" />
          <h2 className="text-lg font-semibold">Summary</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm text-slate-600 mb-1">Profit / Loss</div>
            <div className="text-sm text-slate-500 mb-2">Total</div>
            <div className={`text-2xl font-bold ${dashboard.summary.profitLoss.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrencyPKR(dashboard.summary.profitLoss.total)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm text-slate-600 mb-1">Profit / Loss</div>
            <div className="text-sm text-slate-500 mb-2">This Month</div>
            <div className={`text-2xl font-bold ${dashboard.summary.profitLoss.thisMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrencyPKR(dashboard.summary.profitLoss.thisMonth)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm text-slate-600 mb-1">Profit / Loss</div>
            <div className="text-sm text-slate-500 mb-2">Today</div>
            <div className={`text-2xl font-bold ${dashboard.summary.profitLoss.today >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrencyPKR(dashboard.summary.profitLoss.today)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-md border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/admin/accounts/cashbook" className="flex items-center gap-2 rounded-md border p-3 hover:bg-gray-50 transition-colors">
            <FileText className="h-4 w-4 text-brand" />
            <span className="text-sm">Cashbook</span>
          </Link>
          <Link href="/admin/accounts/expenses" className="flex items-center gap-2 rounded-md border p-3 hover:bg-gray-50 transition-colors">
            <Receipt className="h-4 w-4 text-brand" />
            <span className="text-sm">Expenses</span>
          </Link>
          <Link href="/admin/accounts/reports" className="flex items-center gap-2 rounded-md border p-3 hover:bg-gray-50 transition-colors">
            <TrendingUp className="h-4 w-4 text-brand" />
            <span className="text-sm">Reports</span>
          </Link>
          <Link href="/admin/accounts/settings" className="flex items-center gap-2 rounded-md border p-3 hover:bg-gray-50 transition-colors">
            <Settings className="h-4 w-4 text-brand" />
            <span className="text-sm">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  )
}


