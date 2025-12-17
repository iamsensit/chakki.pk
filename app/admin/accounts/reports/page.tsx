"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0) }

export default function ReportsPage() {
  const { data } = useSWR("/api/journal", fetcher)
  const entries = data?.data?.entries || []

  // Naive P&L from journal: Revenue credits - COGS debits - Expense debits
  let revenue = 0, cogs = 0, expenses = 0
  for (const e of entries) {
    for (const l of e.lines || []) {
      // We don't have account types on lines without populate; using simple heuristics by description/code not available here.
      // MVP: infer by description keywords (can be improved by populating account types on server).
      const desc = (l.description || "").toLowerCase()
      if (desc.includes("sale")) revenue += Number(l.credit || 0)
      if (desc.includes("cogs")) cogs += Number(l.debit || 0)
      if (desc.includes("expense") || desc.includes("util") || desc.includes("rent") || desc.includes("salary")) expenses += Number(l.debit || 0)
    }
  }
  const gross = revenue - cogs
  const net = gross - expenses

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Revenue" value={revenue} />
        <Card title="COGS" value={cogs} />
        <Card title="Net Profit" value={net} />
      </div>
      <div className="rounded-md border p-4">
        <div className="font-medium mb-2">Notes</div>
        <div className="text-sm text-slate-600">This MVP P&L estimates amounts from journal line descriptions. We’ll upgrade it to use account types by populating accounts in the journal API so it’s exact.</div>
      </div>
    </div>
  )
}

function Card({ title, value }:{ title:string, value:number }){
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="text-2xl font-semibold">{value.toFixed(2)}</div>
    </div>
  )
}


