"use client"

import useSWR from "swr"
import { useState, useEffect } from "react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SettingsPage() {
  const { data, mutate } = useSWR("/api/settings", fetcher)
  const accounts = data?.data?.accounts || []
  const [form, setForm] = useState<any>(null)

  useEffect(() => {
    if (data?.data?.settings && !form) setForm(data.data.settings)
    if (!data?.data?.settings && !form) setForm({ defaultAccounts: {}, taxRates: [{ name: "Standard", rate: 0 }] })
  }, [data])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    mutate()
  }

  if (!form) return null

  const sel = (key: string, val: string) => setForm((f: any) => ({ ...f, defaultAccounts: { ...f.defaultAccounts, [key]: val || null } }))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <form onSubmit={save} className="rounded-md border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Cash Account" value={form.defaultAccounts?.cashAccountId || ""} onChange={(v)=>sel("cashAccountId", v)} accounts={accounts} />
          <Select label="Bank Account" value={form.defaultAccounts?.bankAccountId || ""} onChange={(v)=>sel("bankAccountId", v)} accounts={accounts} />
          <Select label="Sales Revenue" value={form.defaultAccounts?.salesAccountId || ""} onChange={(v)=>sel("salesAccountId", v)} accounts={accounts} />
          <Select label="COGS" value={form.defaultAccounts?.cogsAccountId || ""} onChange={(v)=>sel("cogsAccountId", v)} accounts={accounts} />
          <Select label="Inventory" value={form.defaultAccounts?.inventoryAccountId || ""} onChange={(v)=>sel("inventoryAccountId", v)} accounts={accounts} />
          <Select label="Accounts Receivable" value={form.defaultAccounts?.arAccountId || ""} onChange={(v)=>sel("arAccountId", v)} accounts={accounts} />
          <Select label="Tax Payable" value={form.defaultAccounts?.taxPayableAccountId || ""} onChange={(v)=>sel("taxPayableAccountId", v)} accounts={accounts} />
        </div>
        <div>
          <label className="block text-sm mb-1">Tax Rates</label>
          <div className="space-y-2">
            {form.taxRates?.map((t:any, idx:number)=>(
              <div key={idx} className="grid grid-cols-2 gap-2">
                <input className="border rounded px-3 py-2 text-sm" placeholder="Name" value={t.name} onChange={(e)=>setForm((f:any)=>({...f, taxRates: f.taxRates.map((x:any,i:number)=>i===idx?{...x,name:e.target.value}:x)}))} />
                <input className="border rounded px-3 py-2 text-sm" placeholder="Rate %" value={t.rate} onChange={(e)=>setForm((f:any)=>({...f, taxRates: f.taxRates.map((x:any,i:number)=>i===idx?{...x,rate:Number(e.target.value)||0}:x)}))} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <button className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Save</button>
        </div>
      </form>
    </div>
  )
}

function Select({ label, value, onChange, accounts }:{ label:string, value:string, onChange:(v:string)=>void, accounts:any[] }){
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <select className="border rounded px-3 py-2 text-sm w-full" value={value} onChange={(e)=>onChange(e.target.value)}>
        <option value="">Select</option>
        {accounts.map((a:any)=>(<option key={a._id} value={a._id}>{a.code} — {a.name}</option>))}
      </select>
    </div>
  )
}


