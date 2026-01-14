"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Download, Smartphone, Phone, Mail, MapPin, Facebook, Instagram, MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function Footer() {
	const [isInstallable, setIsInstallable] = useState(false)
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
	const [isInstalled, setIsInstalled] = useState(false)

	useEffect(() => {
		// Check if app is already installed (standalone mode)
		if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
			setIsInstalled(true)
			return
		}

		// Listen for beforeinstallprompt event
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault()
			setDeferredPrompt(e)
			setIsInstallable(true)
		}

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

		// Check if app was just installed
		window.addEventListener('appinstalled', () => {
			setIsInstalled(true)
			setIsInstallable(false)
			setDeferredPrompt(null)
			toast.success('App installed successfully!')
		})

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
		}
	}, [])

	const handleInstallClick = async () => {
		if (!deferredPrompt) {
			toast.info('Install option not available')
			return
		}

		// Show the install prompt
		deferredPrompt.prompt()

		// Wait for the user to respond
		const { outcome } = await deferredPrompt.userChoice

		if (outcome === 'accepted') {
			setIsInstallable(false)
			setDeferredPrompt(null)
		}
	}

	return (
		<footer className="border-t bg-white mt-12 sm:mt-16">
			<div className="container-pg py-8">
				{/* Main Footer Content */}
				<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
					{/* Brand Section with Logo */}
					<div>
						<Link href="/" className="flex items-center gap-2 mb-3">
							<div className="relative h-10 w-10">
								<Image src="/icon.png" alt="Chakki" width={40} height={40} className="object-contain" />
							</div>
							<div>
								<div className="text-lg font-semibold text-slate-900">Chakki.pk</div>
								<div className="text-xs text-slate-500">by Digital Dervish</div>
							</div>
						</Link>
						<p className="text-sm text-slate-600 mb-4">Wholesale grains & essentials at fair prices. Fresh products delivered to your doorstep.</p>
						
						{/* Social Media Icons */}
						<div className="flex items-center gap-3">
							<a 
								href="https://facebook.com" 
								target="_blank" 
								rel="noopener noreferrer"
								className="p-2 text-slate-600 hover:text-brand-accent hover:bg-gray-50 transition-colors"
								aria-label="Facebook"
							>
								<Facebook className="h-5 w-5" />
							</a>
							<a 
								href="https://instagram.com" 
								target="_blank" 
								rel="noopener noreferrer"
								className="p-2 text-slate-600 hover:text-brand-accent hover:bg-gray-50 transition-colors"
								aria-label="Instagram"
							>
								<Instagram className="h-5 w-5" />
							</a>
							<a 
								href="https://wa.me/923393399393" 
								target="_blank" 
								rel="noopener noreferrer"
								className="p-2 text-slate-600 hover:text-green-600 hover:bg-gray-50 transition-colors"
								aria-label="WhatsApp"
							>
								<MessageCircle className="h-5 w-5" />
							</a>
						</div>
					</div>

					{/* Quick Links */}
					<div>
						<div className="text-sm font-semibold text-slate-900 mb-3">Quick Links</div>
						<ul className="space-y-2 text-sm">
							<li><Link href="/products" className="text-slate-600 hover:text-brand-accent transition-colors flex items-center gap-2 font-semibold">Shop</Link></li>
							<li><Link href="/help" className="text-slate-600 hover:text-brand-accent transition-colors flex items-center gap-2 font-semibold">Help Center</Link></li>
							<li><Link href="/shipping" className="text-slate-600 hover:text-brand-accent transition-colors flex items-center gap-2 font-semibold">Shipping & Delivery</Link></li>
							<li><Link href="/returns" className="text-slate-600 hover:text-brand-accent transition-colors flex items-center gap-2 font-semibold">Returns & Refunds</Link></li>
							<li><Link href="/categories" className="text-slate-600 hover:text-brand-accent transition-colors flex items-center gap-2 font-semibold">Categories</Link></li>
						</ul>
					</div>

					{/* Company & Contact */}
					<div>
						<div className="text-sm font-semibold text-slate-900 mb-3">Company</div>
						<ul className="space-y-2 text-sm mb-4">
							<li><Link href="/about" className="text-slate-600 hover:text-brand-accent transition-colors font-semibold">About Us</Link></li>
							<li><Link href="/contact" className="text-slate-600 hover:text-brand-accent transition-colors font-semibold">Contact Us</Link></li>
							<li><Link href="/terms" className="text-slate-600 hover:text-brand-accent transition-colors font-semibold">Terms & Privacy</Link></li>
						</ul>
						
						{/* Contact Info */}
						<div className="space-y-2 text-sm">
							<a href="tel:03393399393" className="flex items-center gap-2 text-slate-600 hover:text-brand-accent transition-colors">
								<Phone className="h-4 w-4" />
								<span>0339-3399393</span>
							</a>
							<a href="mailto:info@chakki.pk" className="flex items-center gap-2 text-slate-600 hover:text-brand-accent transition-colors">
								<Mail className="h-4 w-4" />
								<span>info@chakki.pk</span>
							</a>
							<div className="flex items-start gap-2 text-slate-600">
								<MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
								<span className="text-xs">Lahore, Pakistan</span>
							</div>
						</div>
					</div>

					{/* Install App & Payment Methods */}
					<div>
						{/* Install App */}
						<div className="text-sm font-semibold text-slate-900 mb-3">Get the App</div>
						{!isInstalled && isInstallable && (
							<button
								onClick={handleInstallClick}
								className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand text-white text-sm font-medium transition-colors mb-4"
							>
								<Download className="h-4 w-4" />
								<span>Install App</span>
							</button>
						)}
						{isInstalled && (
							<div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
								<Smartphone className="h-4 w-4" />
								<span>App Installed</span>
							</div>
						)}
						{!isInstallable && !isInstalled && (
							<p className="text-xs text-slate-500 mb-4">Install option will appear when available</p>
						)}

						{/* Payment Methods */}
						<div className="text-sm font-semibold text-slate-900 mb-3">We Accept</div>
						<div className="flex flex-wrap items-center gap-2">
							<img src="/jazzcash.png" alt="JazzCash" className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
							<img src="/easypaisa.png" alt="EasyPaisa" className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
							<img src="/cod.png" alt="Cash on Delivery" className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
							<img src="/visa.png" alt="Visa" className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
							<img src="/master.png" alt="Mastercard" className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
						</div>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="border-t pt-6">
					<div className="flex flex-col sm:flex-row justify-between items-center gap-4">
						<div className="text-xs text-slate-500 text-center sm:text-left">
							© {new Date().getFullYear()} Chakki.pk. All rights reserved.
						</div>
						<div className="flex items-center gap-4 text-xs text-slate-500">
							<Link href="/terms" className="hover:text-brand-accent transition-colors font-semibold">Terms</Link>
							<span>•</span>
							<Link href="/terms" className="hover:text-brand-accent transition-colors font-semibold">Privacy</Link>
							<span>•</span>
							<a href="https://dervish.pk" target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent transition-colors font-semibold">Powered by Digital Dervish</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}
