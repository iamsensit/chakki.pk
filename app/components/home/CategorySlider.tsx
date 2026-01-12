"use client"

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CategorySlider({ categories, categoryImages }: { categories: any[]; categoryImages: Record<string, string> }) {
	return (
		<div className="relative md:px-0 px-6 pt-0">
			<div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 scroll-smooth" id="categories-slider">
				{categories.map((cat: any) => {
					const catNameLower = cat.name.toLowerCase()
					const imageUrl = cat.image || categoryImages[catNameLower] || '/categories/default.jpg'
					return (
						<Link
							key={cat.name}
							href={`/products?category=${encodeURIComponent(cat.name)}`}
							className="flex flex-col items-center gap-2 sm:gap-2.5 min-w-[90px] sm:min-w-[110px] md:min-w-[120px] flex-shrink-0 group"
						>
							<div className="w-20 h-20 sm:w-24 sm:h-24 md:w-20 md:h-20 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 group-hover:border-brand-accent transition-all duration-300 shadow-sm group-hover:shadow-md">
								{imageUrl && imageUrl !== '/categories/default.jpg' ? (
									<img
										src={imageUrl}
										alt={cat.name}
										className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
								)}
							</div>
							<span className="text-[11px] sm:text-xs text-center text-gray-700 font-medium group-hover:text-brand-accent transition-colors line-clamp-2 px-1">
								{cat.name}
							</span>
						</Link>
					)
				})}
			</div>
			{/* Navigation Arrows - Mobile: Small & Professional, Desktop: Original */}
			{categories.length > 4 && (
				<>
					{/* Mobile Arrows - Positioned at image center (not entire div center) */}
					<button
						onClick={() => {
							const slider = document.getElementById('categories-slider')
							if (slider) slider.scrollBy({ left: -240, behavior: 'smooth' })
						}}
						className="md:hidden absolute left-1 top-[40px] -translate-y-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-white hover:shadow-md transition-all duration-200 z-10 flex items-center justify-center"
						aria-label="Scroll left"
					>
						<ChevronLeft className="h-4 w-4 text-gray-600" strokeWidth={2} />
					</button>
					<button
						onClick={() => {
							const slider = document.getElementById('categories-slider')
							if (slider) slider.scrollBy({ left: 240, behavior: 'smooth' })
						}}
						className="md:hidden absolute right-1 top-[40px] -translate-y-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-white hover:shadow-md transition-all duration-200 z-10 flex items-center justify-center"
						aria-label="Scroll right"
					>
						<ChevronRight className="h-4 w-4 text-gray-600" strokeWidth={2} />
					</button>
					{/* Desktop Arrows - Original size */}
					<button
						onClick={() => {
							const slider = document.getElementById('categories-slider')
							if (slider) slider.scrollBy({ left: -200, behavior: 'smooth' })
						}}
						className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 bg-white border rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors z-10 items-center justify-center"
						aria-label="Scroll left"
					>
						<ChevronLeft className="h-5 w-5 text-gray-700" />
					</button>
					<button
						onClick={() => {
							const slider = document.getElementById('categories-slider')
							if (slider) slider.scrollBy({ left: 200, behavior: 'smooth' })
						}}
						className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 bg-white border rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors z-10 items-center justify-center"
						aria-label="Scroll right"
					>
						<ChevronRight className="h-5 w-5 text-gray-700" />
					</button>
				</>
			)}
		</div>
	)
}

