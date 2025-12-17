"use client"

import { ChevronLeft, ChevronRight } from 'lucide-react'
import FlashDealCard from './FlashDealCard'

export default function FlashDealsSlider({ products }: { products: any[] }) {
	return (
		<div className="relative">
			<div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 scroll-smooth" id="flash-deals-slider">
				{products.map((p: any, idx: number) => (
					<FlashDealCard key={p._id || p.id || idx} product={p} />
				))}
			</div>
			{/* Navigation Arrows */}
			{products.length > 4 && (
				<>
					<button
						onClick={() => {
							const slider = document.getElementById('flash-deals-slider')
							if (slider) slider.scrollBy({ left: -300, behavior: 'smooth' })
						}}
						className="absolute left-0 top-1/2 -translate-y-1/2 bg-white border rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors z-10"
						aria-label="Scroll left"
					>
						<ChevronLeft className="h-5 w-5 text-gray-700" />
					</button>
					<button
						onClick={() => {
							const slider = document.getElementById('flash-deals-slider')
							if (slider) slider.scrollBy({ left: 300, behavior: 'smooth' })
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

