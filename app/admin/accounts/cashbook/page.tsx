"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CashbookPage() {
  const { data } = useSWR("/api/journal", fetcher)
  const entries = data?.data?.entries || []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Cashbook</h1>
      <div className="rounded-md border divide-y">
        {entries.map((e: any) => (
          <div key={e._id} className="p-3">
            <div className="text-sm text-slate-600">{new Date(e.date).toLocaleString()} — {e.source} {e.ref ? `#${e.ref}` : ""}</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {e.lines.map((l: any, idx: number) => (
                <div key={idx} className="text-sm flex items-center justify-between border rounded p-2">
                  <div className="truncate">{l.description || 'Line'} </div>
                  <div className="font-mono">
                    {l.debit ? <span className="text-emerald-700">Dr {l.debit.toFixed(2)}</span> : null}
                    {l.credit ? <span className="text-rose-700">Cr {l.credit.toFixed(2)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!entries.length && <div className="p-3 text-sm text-slate-500">No entries yet.</div>}
      </div>
    </div>
  )
}


