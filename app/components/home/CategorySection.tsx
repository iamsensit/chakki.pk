"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'

type Category = {
	name: string
	count: number
	image?: string
}

type CategorySectionProps = {
	categories: Category[]
}

export default function CategorySection({ categories }: CategorySectionProps) {
	if (!categories || categories.length === 0) return null

	return (
		<section className="container-pg py-8 border-b">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-bold">Shop by Category</h2>
				<Link href="/products" className="text-sm text-brand-accent hover:underline">
					View All →
				</Link>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
				{categories.slice(0, 12).map((category, index) => (
					<motion.div
						key={category.name}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, amount: 0.2 }}
						transition={{ duration: 0.3, delay: index * 0.05 }}
					>
						<Link
							href={`/products?category=${encodeURIComponent(category.name)}`}
							className="block group"
						>
							<div className="bg-white border rounded-lg p-4 text-center hover:shadow-lg hover:border-brand transition-all duration-300 group-hover:scale-105">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-[10px] text-gray-400">no image</span>
                  )}
                </div>
								<div className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
									{category.name}
								</div>
								<div className="text-xs text-gray-500">
									{category.count} {category.count === 1 ? 'product' : 'products'}
								</div>
							</div>
						</Link>
					</motion.div>
				))}
			</div>
		</section>
	)
}

