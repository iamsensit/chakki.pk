"use client"

import useSWR from "swr"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function JournalPage() {
  const { data: acc } = useSWR("/api/accounts", fetcher)
  const accounts = acc?.data?.accounts || []
  const [lines, setLines] = useState([{ accountId: "", description: "", debit: "", credit: "" }])
  const [meta, setMeta] = useState({ date: "", source: "MANUAL", ref: "", notes: "" })

  const addLine = () => setLines((l) => [...l, { accountId: "", description: "", debit: "", credit: "" }])
  const post = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...meta,
        lines: lines.map((l) => ({ ...l, debit: Number(l.debit || 0), credit: Number(l.credit || 0) })),
      }),
    })
    setLines([{ accountId: "", description: "", debit: "", credit: "" }])
    setMeta({ date: "", source: "MANUAL", ref: "", notes: "" })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Post Journal</h1>
      <form onSubmit={post} className="rounded-md border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="border rounded px-3 py-2 text-sm" type="date" value={meta.date} onChange={(e)=>setMeta(m=>({...m,date:e.target.value}))} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Source" value={meta.source} onChange={(e)=>setMeta(m=>({...m,source:e.target.value}))} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Ref" value={meta.ref} onChange={(e)=>setMeta(m=>({...m,ref:e.target.value}))} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Notes" value={meta.notes} onChange={(e)=>setMeta(m=>({...m,notes:e.target.value}))} />
        </div>
        <div className="space-y-2">
          {lines.map((l, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select className="border rounded px-3 py-2 text-sm" value={l.accountId} onChange={(e)=>setLines(x=>x.map((y,i)=>i===idx?{...y,accountId:e.target.value}:y))}>
                <option value="">Select account</option>
                {accounts.map((a:any)=>(<option key={a._id} value={a._id}>{a.code} — {a.name}</option>))}
              </select>
              <input className="border rounded px-3 py-2 text-sm" placeholder="Description" value={l.description} onChange={(e)=>setLines(x=>x.map((y,i)=>i===idx?{...y,description:e.target.value}:y))} />
              <input className="border rounded px-3 py-2 text-sm" placeholder="Debit" value={l.debit} onChange={(e)=>setLines(x=>x.map((y,i)=>i===idx?{...y,debit:e.target.value}:y))} />
              <input className="border rounded px-3 py-2 text-sm" placeholder="Credit" value={l.credit} onChange={(e)=>setLines(x=>x.map((y,i)=>i===idx?{...y,credit:e.target.value}:y))} />
            </div>
          ))}
          <button type="button" onClick={addLine} className="text-sm rounded-md border px-3 py-1 hover:bg-gray-50">Add line</button>
        </div>
        <div>
          <button className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Post Journal</button>
        </div>
      </form>
    </div>
  )
}


