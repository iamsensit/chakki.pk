"use client"

import { CreditCard, Headphones, Leaf, TrendingDown, Truck } from 'lucide-react'

const services = [
	{ icon: Leaf, text: 'Fresh Products Every Day' },
	{ icon: CreditCard, text: 'Safe Payment With Any Bank Card' },
	{ icon: Headphones, text: '24/7 Support Always Be There for You' },
	{ icon: TrendingDown, text: 'Low Prices Than in Other Stores' },
	{ icon: Truck, text: 'Free Delivery' },
]

export default function ServiceMarquee() {
	return (
		<section className="bg-gray-50 py-6 border-y overflow-hidden">
			<div className="flex animate-scroll">
				{/* First set */}
				<div className="flex gap-12 pr-12">
					{services.map((service, index) => {
						const Icon = service.icon
						return (
							<div key={`first-${index}`} className="flex items-center gap-3 whitespace-nowrap">
								<Icon className="h-5 w-5 text-orange-600 flex-shrink-0" />
								<span className="text-sm text-gray-700">{service.text}</span>
							</div>
						)
					})}
				</div>
				{/* Duplicate for seamless loop */}
				<div className="flex gap-12 pr-12">
					{services.map((service, index) => {
						const Icon = service.icon
						return (
							<div key={`second-${index}`} className="flex items-center gap-3 whitespace-nowrap">
								<Icon className="h-5 w-5 text-orange-600 flex-shrink-0" />
								<span className="text-sm text-gray-700">{service.text}</span>
							</div>
						)
					})}
				</div>
			</div>
		</section>
	)
}

