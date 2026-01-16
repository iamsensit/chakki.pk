"use client"

import { ChevronLeft, ChevronRight, Zap, Star, TrendingUp, Award, Sparkles, Flame, ShoppingBag } from 'lucide-react'
import FlashDealCard from './FlashDealCard'
import { motion } from 'framer-motion'

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

export default function ProductSection({ title, products, sliderId, icon = 'flash' }: ProductSectionProps) {
	const IconComponent = iconMap[icon] || Zap
	
	// Determine icon based on title if not provided
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
	
	const finalIcon = icon !== 'flash' ? icon : getIconFromTitle(title)
	const FinalIconComponent = iconMap[finalIcon] || Zap
	
	return (
		<section className="container-pg py-4 sm:py-6 md:py-8">
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.5 }}
				className="flex items-center gap-3 mb-4 sm:mb-6"
			>
				<div className="flex items-center gap-2 sm:gap-3">
					<motion.div
						animate={{ 
							rotate: [0, 10, -10, 0],
							scale: [1, 1.1, 1]
						}}
						transition={{ 
							duration: 2,
							repeat: Infinity,
							repeatDelay: 3,
							ease: "easeInOut"
						}}
						className="p-2 bg-gradient-to-br from-brand-accent to-brand-accent rounded-lg shadow-lg"
					>
						<FinalIconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
					</motion.div>
					<h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
						<span className="bg-gradient-to-r from-brand-accent via-brand-accent to-brand-accent bg-clip-text text-transparent animate-gradient">
							{title}
						</span>
					</h2>
				</div>
				<div className="flex-1 h-0.5 bg-gradient-to-r from-brand-accent/30 via-brand-accent/20 to-transparent"></div>
			</motion.div>
			<div className="relative">
				<div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar pb-2 scroll-smooth" id={sliderId}>
					{products.map((p: any, idx: number) => (
						<motion.div
							key={p._id || p.id || idx}
							initial={{ opacity: 0, x: 20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.3, delay: idx * 0.05 }}
						>
							<FlashDealCard product={p} />
						</motion.div>
					))}
				</div>
				{/* Navigation Arrows */}
				{products.length > 4 && (
					<>
						<button
							onClick={() => {
								const slider = document.getElementById(sliderId)
								if (slider) slider.scrollBy({ left: -300, behavior: 'smooth' })
							}}
							className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2 shadow-lg hover:bg-white hover:shadow-xl transition-all z-10 group"
							aria-label="Scroll left"
						>
							<ChevronLeft className="h-5 w-5 text-gray-700 group-hover:text-brand-accent transition-colors" />
						</button>
						<button
							onClick={() => {
								const slider = document.getElementById(sliderId)
								if (slider) slider.scrollBy({ left: 300, behavior: 'smooth' })
							}}
							className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2 shadow-lg hover:bg-white hover:shadow-xl transition-all z-10 group"
							aria-label="Scroll right"
						>
							<ChevronRight className="h-5 w-5 text-gray-700 group-hover:text-brand-accent transition-colors" />
						</button>
					</>
				)}
			</div>
		</section>
	)
}

