"use client"

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CategorySlider({ categories, categoryImages }: { categories: any[]; categoryImages: Record<string, string> }) {
	return (
		<div className="relative">
			<div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 scroll-smooth" id="categories-slider">
				{categories.map((cat: any) => {
					const catNameLower = cat.name.toLowerCase()
					const imageUrl = cat.image || categoryImages[catNameLower] || '/categories/default.jpg'
					return (
						<Link
							key={cat.name}
							href={`/products?category=${encodeURIComponent(cat.name)}`}
							className="flex flex-col items-center gap-2 min-w-[120px] flex-shrink-0 group"
						>
							<div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 group-hover:border-brand-accent transition-colors">
								{imageUrl && imageUrl !== '/categories/default.jpg' ? (
									<img
										src={imageUrl}
										alt={cat.name}
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
								)}
							</div>
							<span className="text-xs text-center text-gray-700 font-medium group-hover:text-brand-accent transition-colors">
								{cat.name}
							</span>
						</Link>
					)
				})}
			</div>
			{/* Navigation Arrows */}
			{categories.length > 5 && (
				<>
					<button
						onClick={() => {
							const slider = document.getElementById('categories-slider')
							if (slider) slider.scrollBy({ left: -200, behavior: 'smooth' })
						}}
						className="absolute left-0 top-1/2 -translate-y-1/2 bg-white border rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors z-10"
						aria-label="Scroll left"
					>
						<ChevronLeft className="h-5 w-5 text-gray-700" />
					</button>
					<button
						onClick={() => {
							const slider = document.getElementById('categories-slider')
							if (slider) slider.scrollBy({ left: 200, behavior: 'smooth' })
						}}
						className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors z-10"
						aria-label="Scroll right"
					>
						<ChevronRight className="h-5 w-5 text-gray-700" />
					</button>
				</>
			)}
		</div>
	)
}

