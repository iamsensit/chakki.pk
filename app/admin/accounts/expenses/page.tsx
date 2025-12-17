"use client"

import useSWR from "swr"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ExpensesPage() {
  const { data, mutate } = useSWR("/api/expenses", fetcher)
  const items = data?.data?.items || []
  const [form, setForm] = useState({ date: "", category: "", amount: "", paymentMethod: "CASH", description: "" })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount || 0),
        date: form.date || undefined,
      }),
    })
    setForm({ date: "", category: "", amount: "", paymentMethod: "CASH", description: "" })
    mutate()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Expenses</h1>
      <form onSubmit={submit} className="rounded-md border p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input className="border rounded px-3 py-2 text-sm" type="date" value={form.date} onChange={(e)=>setForm(f=>({...f, date: e.target.value}))} />
        <input className="border rounded px-3 py-2 text-sm" placeholder="Category (e.g., Utilities)" value={form.category} onChange={(e)=>setForm(f=>({...f, category: e.target.value}))} />
        <input className="border rounded px-3 py-2 text-sm" placeholder="Amount" value={form.amount} onChange={(e)=>setForm(f=>({...f, amount: e.target.value}))} />
        <select className="border rounded px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e)=>setForm(f=>({...f, paymentMethod: e.target.value}))}>
          <option value="CASH">Cash</option>
          <option value="BANK">Bank</option>
        </select>
        <input className="border rounded px-3 py-2 text-sm md:col-span-5" placeholder="Description" value={form.description} onChange={(e)=>setForm(f=>({...f, description: e.target.value}))} />
        <div className="md:col-span-5">
          <button className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Add Expense</button>
        </div>
      </form>

      <div className="rounded-md border divide-y">
        {items.map((x: any) => (
          <div key={x._id} className="p-3 text-sm flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium">{x.category} — {Number(x.amount).toFixed(2)} ({x.paymentMethod})</div>
              <div className="text-slate-600">{new Date(x.date).toLocaleDateString()} · {x.description}</div>
            </div>
            <div className="text-xs">{x.posted ? "Posted" : "Unposted"}</div>
          </div>
        ))}
        {!items.length && <div className="p-3 text-sm text-slate-500">No expenses yet.</div>}
      </div>
    </div>
  )
}


