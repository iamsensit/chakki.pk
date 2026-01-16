"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PromoSlide = {
	id: string
	image?: string
	link: string
	bgColor?: string
}

const promoSlides: PromoSlide[] = [
	{
		id: '1',
		image: '/ss1.jpg',
		link: '/products',
		bgColor: 'bg-gradient-to-br from-brand-accent/10 to-brand-accent/5'
	},
	{
		id: '2',
		image: '/ss12.jpg',
		link: '/products',
		bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-100'
	},
	{
		id: '3',
		image: '/ss13.png',
		link: '/products',
		bgColor: 'bg-gradient-to-br from-green-50 to-emerald-100'
	}
]

export default function PromoBanner() {
	const [currentIndex, setCurrentIndex] = useState(0)
	const [direction, setDirection] = useState(0)
	const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
	const mountedRef = useRef(true)

	useEffect(() => {
		mountedRef.current = true
		const interval = setInterval(() => {
			if (mountedRef.current) {
				setDirection(1)
				setCurrentIndex((prev) => (prev + 1) % promoSlides.length)
			}
		}, 5000)

		return () => {
			mountedRef.current = false
			clearInterval(interval)
		}
	}, [])

	const goToSlide = (index: number) => {
		setDirection(index > currentIndex ? 1 : -1)
		setCurrentIndex(index)
	}

	const goToPrevious = () => {
		setDirection(-1)
		setCurrentIndex((prev) => (prev - 1 + promoSlides.length) % promoSlides.length)
	}

	const goToNext = () => {
		setDirection(1)
		setCurrentIndex((prev) => (prev + 1) % promoSlides.length)
	}

	const slideVariants = {
		enter: (direction: number) => ({
			x: direction > 0 ? 1000 : -1000,
			opacity: 0
		}),
		center: {
			zIndex: 1,
			x: 0,
			opacity: 1
		},
		exit: (direction: number) => ({
			zIndex: 0,
			x: direction < 0 ? 1000 : -1000,
			opacity: 0
		})
	}

	return (
		<div className="relative rounded-lg overflow-hidden h-full min-h-[400px]">
			<div className="relative w-full h-full">
				<AnimatePresence initial={false} custom={direction}>
					<motion.div
						key={currentIndex}
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{
							x: { type: 'spring', stiffness: 300, damping: 30 },
							opacity: { duration: 0.2 }
						}}
						className="absolute inset-0"
					>
						<Link href={promoSlides[currentIndex].link} className="block w-full h-full relative" {...({} as any)}>
							{promoSlides[currentIndex].image && !imageErrors.has(promoSlides[currentIndex].image!) ? (
								<Image
									src={promoSlides[currentIndex].image!}
									alt={`Promo slide ${currentIndex + 1}`}
									fill
									className="object-cover"
									priority={currentIndex === 0}
									unoptimized
									onError={() => {
										if (promoSlides[currentIndex].image) {
											setImageErrors((prev) => new Set(prev).add(promoSlides[currentIndex].image!))
										}
									}}
								/>
							) : (
								<div className={`absolute inset-0 ${promoSlides[currentIndex].bgColor || 'bg-gradient-to-br from-brand-accent/10 to-brand-accent/5'}`}>
									{/* Decorative elements */}
									<div className="absolute inset-0 opacity-10">
										<div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl" />
										<div className="absolute bottom-10 left-10 w-48 h-48 bg-white rounded-full blur-2xl" />
									</div>
								</div>
							)}
						</Link>
					</motion.div>
				</AnimatePresence>
			</div>

			{/* Navigation Arrows */}
			<button
				onClick={goToPrevious}
				className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
				aria-label="Previous slide"
			>
				<ChevronLeft className="h-6 w-6 text-gray-800" />
			</button>
			<button
				onClick={goToNext}
				className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
				aria-label="Next slide"
			>
				<ChevronRight className="h-6 w-6 text-gray-800" />
			</button>

			{/* Pagination Dots */}
			<div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
				{promoSlides.map((_, index) => (
					<button
						key={index}
						onClick={() => goToSlide(index)}
						className={`h-2 rounded-full transition-all ${
							index === currentIndex
								? 'w-8 bg-white'
								: 'w-2 bg-white/50 hover:bg-white/75'
						}`}
						aria-label={`Go to slide ${index + 1}`}
					/>
				))}
			</div>
		</div>
	)
}

