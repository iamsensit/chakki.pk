"use client"

import { CreditCard, Headphones, Leaf, TrendingDown, Truck, Zap, Bell } from 'lucide-react'

const services = [
	{ icon: Zap, text: 'Flash Deals & Special Offers' },
	{ icon: Leaf, text: 'Fresh Products Every Day' },
	{ icon: CreditCard, text: 'Safe Payment With Any Bank Card' },
	{ icon: Headphones, text: '24/7 Support Always Be There for You' },
	{ icon: TrendingDown, text: 'Low Prices Than in Other Stores' },
	{ icon: Truck, text: 'Free Delivery' },
	{ icon: Bell, text: 'Subscribe Us for Latest Updates' },
]

export default function ServiceMarquee() {
	return (
		<section className="bg-gray-50 py-3 sm:py-4 md:py-6 border-y border-gray-200 overflow-hidden">
			<div className="flex animate-scroll">
				{/* First set */}
				<div className="flex gap-6 sm:gap-8 md:gap-12 pr-6 sm:pr-8 md:pr-12">
					{services.map((service, index) => {
						const Icon = service.icon
						return (
							<div key={`first-${index}`} className="flex items-center gap-2 sm:gap-3 whitespace-nowrap">
								<Icon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-accent flex-shrink-0" />
								<span className="text-xs sm:text-sm text-gray-700 font-semibold">{service.text}</span>
							</div>
						)
					})}
				</div>
				{/* Duplicate for seamless loop */}
				<div className="flex gap-6 sm:gap-8 md:gap-12 pr-6 sm:pr-8 md:pr-12">
					{services.map((service, index) => {
						const Icon = service.icon
						return (
							<div key={`second-${index}`} className="flex items-center gap-2 sm:gap-3 whitespace-nowrap">
								<Icon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-accent flex-shrink-0" />
								<span className="text-xs sm:text-sm text-gray-700 font-semibold">{service.text}</span>
							</div>
						)
					})}
				</div>
			</div>
		</section>
	)
}

