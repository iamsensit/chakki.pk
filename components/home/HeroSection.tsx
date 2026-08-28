"use client"

import CategorySidebar from './CategorySidebar'
import HeroBanner from './HeroBanner'

export default function HeroSection({ categories }: { categories?: any[] }) {
	return (
		<section className="container-pg py-4 sm:py-6">
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
				{/* Left Column: Vertical Category Sidebar (Desktop Only) */}
				<div className="hidden lg:block lg:col-span-4 xl:col-span-3">
					<CategorySidebar categories={categories} />
				</div>

				{/* Right Column: Hero Banner */}
				<div className="lg:col-span-8 xl:col-span-9">
					<HeroBanner />
				</div>
			</div>
		</section>
	)
}
