"use client"

import Link from 'next/link'
import {
	ChevronLeft,
	ChevronRight,
	Zap,
	Star,
	TrendingUp,
	Award,
	Sparkles,
	Flame,
	ShoppingBag
} from 'lucide-react'
import ProductCard from '@/app/components/product/ProductCard'

type ProductSectionProps = {
	title: string
	products: any[]
	sliderId: string
	icon?: 'flash' | 'trending' | 'featured' | 'bestseller' | 'hot' | 'new' | 'special'
}

const iconMap = {
	flash: Zap,
	trending: TrendingUp,
	featured: Star,
	bestseller: Award,
	hot: Flame,
	new: Sparkles,
	special: ShoppingBag,
}

export default function ProductSection({
	title,
	products,
	sliderId,
	icon = 'flash',
}: ProductSectionProps) {
	const getIconFromTitle = (title: string): keyof typeof iconMap => {
		const lower = title.toLowerCase()
		if (lower.includes('flash') || lower.includes('deal')) return 'flash'
		if (lower.includes('trending')) return 'trending'
		if (lower.includes('featured')) return 'featured'
		if (lower.includes('best') || lower.includes('seller')) return 'bestseller'
		if (lower.includes('hot')) return 'hot'
		if (lower.includes('new') || lower.includes('arrival')) return 'new'
		if (lower.includes('special') || lower.includes('offer')) return 'special'
		return 'flash'
	}

	const finalIconKey = icon !== 'flash' ? icon : getIconFromTitle(title)
	const IconComponent = iconMap[finalIconKey] || Zap

	function scrollLeft() {
		const el = document.getElementById(sliderId)
		if (el) el.scrollBy({ left: -280, behavior: 'smooth' })
	}

	function scrollRight() {
		const el = document.getElementById(sliderId)
		if (el) el.scrollBy({ left: 280, behavior: 'smooth' })
	}

	if (!products || products.length === 0) return null

	return (
		<section className="container-pg py-5 sm:py-7">
			{/* Section Header */}
			<div className="flex items-center justify-between gap-4 mb-4">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-xl bg-[#7EB338]/10 text-[#7EB338]">
						<IconComponent className="h-5 w-5 stroke-[2.5]" />
					</div>
					<div>
						<h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#2D3748]">
							{title}
						</h2>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Link
						href="/products"
						className="hidden sm:inline-flex text-xs font-bold text-[#7EB338] hover:text-[#6fa02f] hover:underline mr-2"
					>
						View All Products &rarr;
					</Link>

					{/* Left / Right Slider Controls */}
					<button
						onClick={scrollLeft}
						className="p-2 rounded-full border border-[#E2E8F0] bg-white hover:bg-[#F5EFE0] hover:text-[#7EB338] text-[#2D3748] shadow-xs transition-colors"
						aria-label="Previous Products"
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
					<button
						onClick={scrollRight}
						className="p-2 rounded-full border border-[#E2E8F0] bg-white hover:bg-[#F5EFE0] hover:text-[#7EB338] text-[#2D3748] shadow-xs transition-colors"
						aria-label="Next Products"
					>
						<ChevronRight className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Products Horizontal Slider */}
			<div className="relative">
				<div
					id={sliderId}
					className="flex gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 scroll-smooth"
				>
					{products.map((p, idx) => {
						const pid = String(p._id || p.id || idx)
						return (
							<div
								key={pid}
								className="w-[185px] sm:w-[225px] md:w-[245px] lg:w-[260px] flex-shrink-0 flex flex-col"
							>
								<ProductCard
									id={pid}
									title={p.title}
									description={p.description || ''}
									badges={p.badges || []}
									images={p.images || []}
									variants={p.variants || []}
									href={`/products/${p.slug || pid}`}
								/>
							</div>
						)
					})}
				</div>
			</div>
		</section>
	)
}
