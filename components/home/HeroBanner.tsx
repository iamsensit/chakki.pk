"use client"

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, ShieldCheck, Zap, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HeroBanner() {
	return (
		<div className="relative overflow-hidden rounded-2xl bg-[#F5EFE0] border border-[#E2E8F0] shadow-sm p-6 sm:p-8 md:p-10 lg:p-12 h-full flex flex-col justify-center min-h-[440px]">
			{/* Background Decorative Circles */}
			<div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#7EB338]/10 blur-3xl pointer-events-none" />
			<div className="absolute -bottom-20 right-48 w-60 h-60 rounded-full bg-[#F08C38]/10 blur-2xl pointer-events-none" />

			<div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
				{/* Left Column: Two-Tone Heading, Subtext & Dual Pill Buttons */}
				<div className="md:col-span-7 space-y-5 sm:space-y-6">
					{/* Top Tag */}
					<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-xs border border-[#E2E8F0] shadow-xs">
						<Sparkles className="h-4 w-4 text-[#F08C38]" />
						<span className="text-xs font-bold uppercase tracking-wider text-[#2D3748]">
							Weekend Special Offer • 30% OFF
						</span>
					</div>

					{/* Two-tone bold display heading */}
					<h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#2D3748] leading-[1.15]">
						Make Breakfast <br />
						<span className="text-[#7EB338]">Healthy & Fresh</span>
					</h1>

					{/* Descriptive subtext */}
					<p className="text-sm sm:text-base text-[#718096] max-w-lg leading-relaxed">
						Wholesale whole wheat atta, stone-ground flours, pure desi ghee, and farm-fresh essentials
						delivered right to your door within 30 minutes.
					</p>

					{/* Dual Pill CTA Buttons */}
					<div className="flex flex-wrap items-center gap-3.5 pt-2">
						{/* Green CTA Button */}
						<Link
							href="/products"
							className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#7EB338] hover:bg-[#6fa02f] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
						>
							<span>Shop Now</span>
							<ArrowRight className="h-4 w-4" />
						</Link>

						{/* Orange CTA Button */}
						<Link
							href={"/products?badge=discount" as any}
							className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#F08C38] hover:bg-[#d97728] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
						>
							<Sparkles className="h-4 w-4" />
							<span>View Deals</span>
						</Link>
					</div>

					{/* Mini Features Row */}
					<div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0]/70 max-w-md">
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-full bg-[#7EB338]/15 text-[#7EB338]">
								<Zap className="h-3.5 w-3.5" />
							</div>
							<span className="text-xs font-semibold text-[#2D3748]">Fast Delivery</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-full bg-[#7EB338]/15 text-[#7EB338]">
								<ShieldCheck className="h-3.5 w-3.5" />
							</div>
							<span className="text-xs font-semibold text-[#2D3748]">100% Pure</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-full bg-[#F08C38]/15 text-[#F08C38]">
								<Heart className="h-3.5 w-3.5" />
							</div>
							<span className="text-xs font-semibold text-[#2D3748]">Best Price</span>
						</div>
					</div>
				</div>

				{/* Right Column: High-Res Cutout Graphics & Floating Badges */}
				<div className="md:col-span-5 relative flex items-center justify-center">
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5 }}
						className="relative w-full max-w-[340px] aspect-square flex items-center justify-center"
					>
						{/* Main Image Container */}
						<div className="relative w-full h-full rounded-3xl bg-white/60 p-4 shadow-xl border border-white/80 backdrop-blur-xs flex items-center justify-center overflow-hidden">
							<Image
								src="/hero.jpg"
								alt="Fresh organic fruits, vegetables, and whole grains"
								fill
								className="object-cover rounded-2xl transform hover:scale-105 transition-transform duration-500"
								priority
								sizes="(max-width: 768px) 100vw, 400px"
							/>
						</div>

						{/* Floating Badge 1: 100% Organic */}
						<motion.div
							initial={{ y: 10, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ delay: 0.3 }}
							className="absolute -top-4 -left-4 sm:-left-6 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-[#E2E8F0] flex items-center gap-2.5 z-20"
						>
							<div className="h-9 w-9 rounded-xl bg-[#7EB338] text-white flex items-center justify-center font-bold">
								🌱
							</div>
							<div>
								<p className="text-[10px] uppercase font-bold text-[#718096]">Quality Guaranteed</p>
								<p className="text-xs font-extrabold text-[#2D3748]">100% Organic & Fresh</p>
							</div>
						</motion.div>

						{/* Floating Badge 2: Best Price Badge */}
						<motion.div
							initial={{ y: -10, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ delay: 0.4 }}
							className="absolute -bottom-4 -right-4 sm:-right-6 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-[#E2E8F0] flex items-center gap-2.5 z-20"
						>
							<div className="h-9 w-9 rounded-xl bg-[#F08C38] text-white flex items-center justify-center font-bold">
								🔥
							</div>
							<div>
								<p className="text-[10px] uppercase font-bold text-[#F08C38]">Wholesale Rates</p>
								<p className="text-xs font-extrabold text-[#2D3748]">Save Up To 30%</p>
							</div>
						</motion.div>
					</motion.div>
				</div>
			</div>
		</div>
	)
}
