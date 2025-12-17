"use client"

import { useRef } from 'react'
import ProductCard from '@/app/components/product/ProductCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Product = {
  id?: string
  _id?: string
  title: string
  description: string
  badges: string[]
  images: string[]
  variants: any[]
}

export default function ProductRow({ items }: { items: Product[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const cardWidth = 240 // px including gap
  function scrollByDir(dir: 'left' | 'right') {
    const el = scrollerRef.current
    if (!el) return
    const delta = dir === 'left' ? -cardWidth : cardWidth
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }
  return (
    <div className="relative">
      <button aria-label="Prev" onClick={() => scrollByDir('left')} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-white shadow border">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div ref={scrollerRef} className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x">
        {items.map((p: any, i: number) => (
          <div key={p.id ?? p._id ?? i} className="snap-start w-[220px] flex-shrink-0">
            <ProductCard id={p.id ?? String(p._id)} title={p.title} description={p.description} badges={p.badges} images={p.images} variants={p.variants} href={`/products/${p.slug ?? (p.id ?? p._id)}`} />
          </div>
        ))}
      </div>
      <button aria-label="Next" onClick={() => scrollByDir('right')} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-white shadow border">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}


