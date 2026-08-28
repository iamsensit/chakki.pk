"use client"

import Link from 'next/link'
import Image from 'next/image'

type CategoryItem = {
	name: string
	slug?: string
	image?: string
	productCount?: number
}

const PASTEL_THEMES = [
	{
		bgClass: 'bg-[#DEF7EC]',
		borderClass: 'border-[#BCF0DA]',
		titleColor: 'text-[#03543F]',
		fallbackImage: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80',
	},
	{
		bgClass: 'bg-[#E1EFFE]',
		borderClass: 'border-[#C3DDFD]',
		titleColor: 'text-[#1E429F]',
		fallbackImage: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80',
	},
	{
		bgClass: 'bg-[#FEF3C7]',
		borderClass: 'border-[#FDE68A]',
		titleColor: 'text-[#92400E]',
		fallbackImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80',
	},
	{
		bgClass: 'bg-[#FCE8F3]',
		borderClass: 'border-[#F8B4D9]',
		titleColor: 'text-[#99154B]',
		fallbackImage: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80',
	},
	{
		bgClass: 'bg-[#EDEBFE]',
		borderClass: 'border-[#DCD7FE]',
		titleColor: 'text-[#5521B5]',
		fallbackImage: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=300&q=80',
	},
	{
		bgClass: 'bg-[#FEE2E2]',
		borderClass: 'border-[#FECACA]',
		titleColor: 'text-[#991B1B]',
		fallbackImage: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=300&q=80',
	},
]

export default function CategoryGrid({ categories = [] }: { categories?: CategoryItem[] }) {
	// Only display if real database categories exist
	if (!categories || categories.length === 0) {
		return null
	}

	return (
		<section className="container-pg py-6 sm:py-8">
			{/* Section Header */}
			<div className="flex items-center justify-between mb-5">
				<div>
					<h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#2D3748]">
						Explore By Category
					</h2>
					<p className="text-xs sm:text-sm text-[#718096]">
						Top wholesale categories delivered fresh to your door
					</p>
				</div>
				<Link
					href="/categories"
					className="text-xs sm:text-sm font-bold text-[#7EB338] hover:text-[#6fa02f] hover:underline"
				>
					View All Categories &rarr;
				</Link>
			</div>

			{/* Responsive Pastel Grid for real DB categories */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
				{categories.map((item, idx) => {
					const theme = PASTEL_THEMES[idx % PASTEL_THEMES.length]
					const imageSrc = item.image && item.image.trim() !== ''
						? item.image.trim()
						: theme.fallbackImage
					const countText = item.productCount !== undefined && item.productCount > 0
						? `${item.productCount} Product${item.productCount === 1 ? '' : 's'}`
						: 'Explore'

					return (
						<Link
							key={item.name + idx}
							href={`/products?category=${encodeURIComponent(item.slug || item.name)}` as any}
							className={`group relative flex flex-col items-center justify-between p-4 rounded-2xl border ${theme.borderClass} ${theme.bgClass} shadow-xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}
						>
							{/* Product Image Cutout Container */}
							<div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-3 rounded-full bg-white/80 p-2 shadow-xs flex items-center justify-center overflow-hidden border border-white/60 group-hover:scale-105 transition-transform duration-300">
								{imageSrc.startsWith('data:') ? (
									<img
										src={imageSrc}
										alt={item.name}
										className="w-full h-full object-cover rounded-full"
									/>
								) : (
									<Image
										src={imageSrc}
										alt={item.name}
										fill
										className="object-cover rounded-full"
										sizes="100px"
									/>
								)}
							</div>

							{/* Title & Product Count */}
							<div className="text-center w-full">
								<h3
									className={`text-xs font-extrabold uppercase tracking-wide truncate ${theme.titleColor} mb-0.5`}
								>
									{item.name}
								</h3>
								<span className="text-[11px] font-medium text-[#718096]">
									{countText}
								</span>
							</div>
						</Link>
					)
				})}
			</div>
		</section>
	)
}
