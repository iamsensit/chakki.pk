"use client"

import { useEffect, useMemo, useState } from 'react'
import { Search, CreditCard, Wallet, Trash2, XCircle } from 'lucide-react'
import { formatCurrencyPKR } from '@/app/lib/price'

type Product = { id?: string; _id?: string; title: string; images: string[]; variants?: any[] }
type CartLine = { productId: string; variantId?: string; title: string; image?: string; quantity: number; unitPrice: number; available?: number }

export default function POSRegister() {
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [cart])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setSuggestions([]); return }
      try {
        const res = await fetch(`/api/products?suggest=1&q=${encodeURIComponent(q)}&limit=8`)
        const json = await res.json()
        setSuggestions(json?.data?.items || [])
      } catch { setSuggestions([]) }
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  async function addProduct(p: Product) {
    const productId = p.id ?? String((p as any)._id)
    try {
      // For POS we need variant and price info; fetch full product if not present in suggestions
      let full = p as any
      if (!full?.variants || full.variants.length === 0) {
        const res = await fetch(`/api/products/${productId}`, { cache: 'no-store' })
        const json = await res.json()
        if (!json?.data) return
        full = json.data
      }
      const v = full.variants?.[0]
      if (!v) return
      const variantId = v.id ?? String(v._id)
      const unitPrice = Math.round((v.pricePerKg || 0) * (v.unitWeight || 1))
      const available = typeof v.stockQty === 'number' ? v.stockQty : undefined
      if (typeof available === 'number' && available <= 0) {
        alert('This product is out of stock.')
        return
      }
      setCart(prev => {
        const idx = prev.findIndex(i => i.productId === productId && i.variantId === variantId)
        if (idx >= 0) {
          const next = [...prev]
          // Cap by availability if provided
          const nextQty = typeof next[idx].available === 'number' ? Math.min(next[idx].available!, next[idx].quantity + 1) : next[idx].quantity + 1
          next[idx] = { ...next[idx], quantity: nextQty }
          return next
        }
        return [{ productId, variantId, title: full.title, image: full.images?.[0], quantity: 1, unitPrice, available }, ...prev]
      })
      setQ('')
      setSuggestions([])
    } catch {
      // ignore
    }
  }

  function updateQty(line: CartLine, qty: number) {
    let newQty = Math.max(0, qty)
    if (typeof line.available === 'number') newQty = Math.min(line.available, newQty)
    setCart(prev => prev.map(i => (i.productId === line.productId && i.variantId === line.variantId) ? { ...i, quantity: newQty } : i).filter(i => i.quantity > 0))
  }

  function removeLine(line: CartLine) {
    setCart(prev => prev.filter(i => !(i.productId === line.productId && i.variantId === line.variantId)))
  }

  async function pay(method: 'CASH' | 'CARD') {
    if (cart.length === 0) return
    try {
      const res = await fetch('/api/pos/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, paymentMethod: method })
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to save sale')
      const sale = json.data.sale
      // Build printable markup pieces
      const createdAt = new Date(sale.createdAt).toLocaleString()
      const logoUrl = (window.location && window.location.origin ? window.location.origin : '') + '/icon.png'
      const rowsHtml = (sale.items || []).map((i: any) => {
        const lineTotal = (i.unitPrice || 0) * (i.quantity || 0)
        const safeTitle = String(i.title || '')
        return `<tr>
                  <td>${safeTitle} × ${i.quantity}</td>
                  <td class="right">Rs. ${lineTotal}</td>
                </tr>`
      }).join('')
      // Open printable receipt
      const win = window.open('', 'PRINT', 'height=650,width=450')
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Receipt ${sale.receiptNumber}</title>
              <style>
                * { box-sizing: border-box; }
                body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#f8fafc; padding:16px; }
                .receipt { width: 360px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:16px; }
                .header { text-align:center; margin-bottom:12px; }
                .logo { height:48px; margin:0 auto 6px; display:block; }
                .title { font-weight:700; font-size:16px; margin:0; }
                .meta { font-size:12px; color:#6b7280; margin-top:2px; }
                .divider { border-top:1px solid #e5e7eb; margin:10px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
                td { padding: 6px 0; vertical-align: top; }
                .right { text-align: right; }
                .muted { color: #6b7280; }
                .total { font-weight:700; }
                .summary td { padding:6px 0; }
              </style>
            </head>
            <body>
              <div class="receipt">
                <div class="header">
                  <img class="logo" src="${logoUrl}" alt="Logo" />
                  <div class="title">Chakki — POS Receipt</div>
                  <div class="meta">${createdAt} · <span>Receipt: ${sale.receiptNumber}</span></div>
                </div>
                <div class="divider"></div>
                <table>
                  ${rowsHtml}
                </table>
                <div class="divider"></div>
                <table class="summary">
                  <tr><td class="muted">Subtotal</td><td class="right">Rs. ${sale.subtotal}</td></tr>
                  <tr><td class="muted">Payment</td><td class="right">${sale.paymentMethod}</td></tr>
                  <tr><td class="total">Total</td><td class="right total">Rs. ${sale.total}</td></tr>
                </table>
                <div class="divider"></div>
                <p class="muted" style="text-align:center">Thank you for your purchase!</p>
              </div>
              <script>window.print(); setTimeout(function(){ window.close(); }, 300);</script>
            </body>
          </html>
        `)
        win.document.close()
        win.focus()
      }
      setCart([])
    } catch (e) {
      alert((e as any)?.message || 'Payment failed')
    }
  }

  function clearCart() {
    if (cart.length === 0) return
    if (confirm('Clear current cart?')) setCart([])
  }

  return (
    <div className="mx-auto w-full max-w-6xl grid gap-6 lg:grid-cols-12">
      <section className="lg:col-span-8">
        <div className="rounded-md border p-3 bg-white">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && suggestions[0]) { e.preventDefault(); addProduct(suggestions[0]) } }}
              placeholder="Scan or search products..."
              className="w-full rounded-md border pl-8 pr-3 py-2"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 rounded-md border divide-y bg-white shadow-sm max-h-80 overflow-auto">
              {suggestions.map(p => (
                <button key={p.id ?? (p as any)._id} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3" onClick={() => addProduct(p)}>
                  <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden">{p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.title}</div>
                    <div className="text-xs text-slate-600 truncate">{p.variants?.[0]?.label || ''}</div>
                  </div>
                  <div className="text-xs text-slate-600">Tap to add</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-md border divide-y bg-white">
          {cart.length === 0 ? (
            <div className="p-4 text-sm text-slate-600">Add products to begin the sale.</div>
          ) : cart.map((line) => (
            <div key={line.productId + (line.variantId || '')} className="p-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded bg-gray-100 overflow-hidden">{line.image && <img src={line.image} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">{line.title}</div>
                <div className="text-xs text-slate-600">Qty × Price: {line.quantity} × {formatCurrencyPKR(line.unitPrice)}</div>
                {typeof line.available === 'number' && (
                  <div className={`text-[11px] mt-0.5 ${line.available - line.quantity <= 0 ? 'text-red-600' : line.available - line.quantity <= 5 ? 'text-yellow-700' : 'text-emerald-700'}`}>
                    {line.available - line.quantity <= 0 ? 'No stock left' : `Left: ${line.available - line.quantity}`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="h-7 w-7 rounded border" onClick={() => updateQty(line, line.quantity - 1)}>-</button>
                <input className="w-12 rounded border px-2 py-1 text-sm text-center" value={line.quantity} onChange={e => updateQty(line, Number(e.target.value) || 0)} />
                <button className="h-7 w-7 rounded border" disabled={typeof line.available === 'number' && line.quantity >= line.available} onClick={() => updateQty(line, line.quantity + 1)}>+</button>
              </div>
              <div className="w-20 text-right font-semibold">{formatCurrencyPKR(line.unitPrice * line.quantity)}</div>
              <button className="h-8 w-8 rounded border text-slate-600 hover:text-red-600" onClick={() => removeLine(line)}><Trash2 className="h-4 w-4 mx-auto" /></button>
            </div>
          ))}
          {cart.length > 0 && (
            <div className="p-3 flex items-center justify-between">
              <button className="inline-flex items-center gap-2 text-sm text-red-600 hover:underline" onClick={clearCart}><XCircle className="h-4 w-4" /> Clear cart</button>
            </div>
          )}
        </div>
      </section>

      <section className="lg:col-span-4">
        <div className="rounded-md border p-4 space-y-3 bg-white">
          <div className="text-sm font-medium">Totals</div>
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-600">Subtotal</div>
            <div className="font-semibold">{formatCurrencyPKR(subtotal)}</div>
          </div>
          <div className="pt-2 border-t flex items-center justify-between">
            <div className="text-sm font-medium">Total</div>
            <div className="font-semibold">{formatCurrencyPKR(subtotal)}</div>
          </div>
          <div className="grid gap-2">
            <button disabled={cart.length === 0} onClick={() => pay('CASH')} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-white transition hover:opacity-90">
              <Wallet className="h-4 w-4" /> Cash
            </button>
            <button disabled={cart.length === 0} onClick={() => pay('CARD')} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-accent px-3 py-2 text-white transition hover:opacity-90">
              <CreditCard className="h-4 w-4" /> Card
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}


