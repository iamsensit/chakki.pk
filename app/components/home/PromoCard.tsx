"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'

type PromoCardProps = {
	title: string
	subtitle: string
	linkText: string
	link: string
	image?: string
	bgColor?: string
}

export default function PromoCard({ title, subtitle, linkText, link, image, bgColor }: PromoCardProps) {
	const [imageError, setImageError] = useState(false)

	return (
		<Link href={link} className="block h-full group" {...({} as any)}>
			<motion.div
				whileHover={{ scale: 1.05 }}
				transition={{ duration: 0.3 }}
				className={`relative h-full min-h-[180px]  overflow-hidden ${!image || imageError ? (bgColor || 'bg-blue-50') : ''}`}
			>
				{/* Background Image */}
				{image && !imageError && (
					<Image
						src={image}
						alt={subtitle}
						fill
						className="object-cover"
						unoptimized
						onError={() => setImageError(true)}
					/>
				)}

				{/* Overlay for better text readability */}
				<div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/10" />

				{/* Decorative Background (only if no image) */}
				{(!image || imageError) && (
					<div className="absolute inset-0 opacity-10">
						<div className="absolute top-0 right-0 w-48 h-48 bg-orange-300 rounded-full blur-2xl" />
						<div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-300 rounded-full blur-xl" />
					</div>
				)}

				{/* Content */}
				<div className="relative z-10 h-full flex flex-col justify-center p-6">
					<p className="text-sm text-white mb-1 drop-shadow-md">{title}</p>
					<h3 className="text-2xl font-bold text-white mb-4 drop-shadow-md">{subtitle}</h3>
					<span className="text-sm text-white underline group-hover:text-gray-200 drop-shadow-md">
						{linkText}
					</span>
				</div>
			</motion.div>
		</Link>
	)
}

