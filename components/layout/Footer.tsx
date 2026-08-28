"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Phone, Mail, MapPin, Download, Sparkles, ShieldCheck, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function Footer() {
	const [isInstallable, setIsInstallable] = useState(false)
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

	useEffect(() => {
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault()
			setDeferredPrompt(e)
			setIsInstallable(true)
		}

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
		}
	}, [])

	const handleInstallClick = async () => {
		if (!deferredPrompt) {
			toast.info('App already installed or browser does not support install')
			return
		}

		deferredPrompt.prompt()
		const { outcome } = await deferredPrompt.userChoice
		if (outcome === 'accepted') {
			setIsInstallable(false)
			setDeferredPrompt(null)
			toast.success('Chakki App installed!')
		}
	}

	return (
		<footer className="bg-white border-t border-[#E2E8F0] mt-12">
			{/* Top Feature Bar */}
			<div className="bg-[#F5EFE0]/60 border-b border-[#E2E8F0]">
				<div className="container-pg py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-white shadow-xs text-[#7EB338]">
							<Sparkles className="h-5 w-5" />
						</div>
						<div>
							<h4 className="text-xs font-bold text-[#2D3748]">100% Pure & Fresh</h4>
							<p className="text-[11px] text-[#718096]">Direct from chakki mill</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-white shadow-xs text-[#7EB338]">
							<Phone className="h-5 w-5" />
						</div>
						<div>
							<h4 className="text-xs font-bold text-[#2D3748]">24/7 Helpline</h4>
							<p className="text-[11px] text-[#718096]">+92 339 3399393</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-white shadow-xs text-[#F08C38]">
							<ShieldCheck className="h-5 w-5" />
						</div>
						<div>
							<h4 className="text-xs font-bold text-[#2D3748]">Wholesale Prices</h4>
							<p className="text-[11px] text-[#718096]">Save up to 30% on bulk</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-white shadow-xs text-[#7EB338]">
							<MapPin className="h-5 w-5" />
						</div>
						<div>
							<h4 className="text-xs font-bold text-[#2D3748]">Fast City Delivery</h4>
							<p className="text-[11px] text-[#718096]">Lahore, Karachi, Islamabad</p>
						</div>
					</div>
				</div>
			</div>

			{/* Main Footer Links */}
			<div className="container-pg py-10">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
					{/* Brand Column */}
					<div className="lg:col-span-2 space-y-4">
						<Link href="/" className="flex items-center gap-2.5">
							<div className="relative h-9 w-9 rounded-xl bg-[#F5EFE0] p-1 flex items-center justify-center border border-[#E2E8F0]">
								<Image
									src="/icon.png"
									alt="Chakki"
									width={32}
									height={32}
									className="object-contain"
								/>
							</div>
							<div>
								<span className="text-lg font-extrabold tracking-tight text-[#2D3748]">
									CHAKKI STORE
								</span>
								<p className="text-[10px] text-[#718096]">by Digital Dervish</p>
							</div>
						</Link>

						<p className="text-xs text-[#718096] leading-relaxed max-w-sm">
							Wholesale food grains, stone-ground whole wheat atta, organic pulses, spices, and pure
							dairy essentials delivered fresh at fair direct prices.
						</p>

						<div className="space-y-2 text-xs text-[#718096]">
							<div className="flex items-center gap-2">
								<Phone className="h-3.5 w-3.5 text-[#7EB338]" />
								<span>Phone: +92 339 3399393</span>
							</div>
							<div className="flex items-center gap-2">
								<Mail className="h-3.5 w-3.5 text-[#7EB338]" />
								<span>Email: support@chakki.pk</span>
							</div>
							<div className="flex items-center gap-2">
								<MapPin className="h-3.5 w-3.5 text-[#7EB338]" />
								<span>Delivery in Lahore, Faisalabad, Islamabad & Rawalpindi</span>
							</div>
						</div>
					</div>

					{/* Navigation Links */}
					<div className="space-y-3">
						<h4 className="text-xs font-extrabold uppercase tracking-wider text-[#2D3748]">
							Quick Links
						</h4>
						<ul className="space-y-2 text-xs text-[#718096]">
							<li>
								<Link href="/products" className="hover:text-[#7EB338] transition-colors">
									All Products
								</Link>
							</li>
							<li>
								<Link href="/categories" className="hover:text-[#7EB338] transition-colors">
									Categories
								</Link>
							</li>
							<li>
								<Link href="/about" className="hover:text-[#7EB338] transition-colors">
									About Us
								</Link>
							</li>
							<li>
								<Link href="/help" className="hover:text-[#7EB338] transition-colors">
									FAQs & Blog
								</Link>
							</li>
							<li>
								<Link href="/contact" className="hover:text-[#7EB338] transition-colors">
									Contact Support
								</Link>
							</li>
						</ul>
					</div>

					{/* Top Categories */}
					<div className="space-y-3">
						<h4 className="text-xs font-extrabold uppercase tracking-wider text-[#2D3748]">
							Categories
						</h4>
						<ul className="space-y-2 text-xs text-[#718096]">
							<li>
								<Link href={"/products?category=flour" as any} className="hover:text-[#7EB338] transition-colors">
									Atta & Flours
								</Link>
							</li>
							<li>
								<Link href={"/products?category=pulses" as any} className="hover:text-[#7EB338] transition-colors">
									Grains & Daal
								</Link>
							</li>
							<li>
								<Link href={"/products?category=rice" as any} className="hover:text-[#7EB338] transition-colors">
									Rice & Sugar
								</Link>
							</li>
							<li>
								<Link href={"/products?category=edible+oils+%26+ghee" as any} className="hover:text-[#7EB338] transition-colors">
									Oils & Desi Ghee
								</Link>
							</li>
							<li>
								<Link href={"/products?category=spices" as any} className="hover:text-[#7EB338] transition-colors">
									Spices & Masala
								</Link>
							</li>
						</ul>
					</div>

					{/* App Install & Payments */}
					<div className="space-y-3">
						<h4 className="text-xs font-extrabold uppercase tracking-wider text-[#2D3748]">
							Get Our Mobile App
						</h4>
						<p className="text-xs text-[#718096]">
							Install Chakki on your Android or iOS device for fast 1-tap ordering.
						</p>

						<button
							onClick={handleInstallClick}
							className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7EB338] hover:bg-[#6fa02f] text-white text-xs font-bold shadow-xs transition-colors"
						>
							<Download className="h-3.5 w-3.5" />
							<span>Install App (PWA)</span>
						</button>

						<div className="pt-2">
							<p className="text-[11px] font-semibold text-[#718096] mb-1.5">
								Accepted Payment Methods
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-[#2D3748]">
									Cash On Delivery
								</span>
								<span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-[#2D3748]">
									JazzCash
								</span>
								<span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-[#2D3748]">
									Easypaisa
								</span>
								<span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-[#2D3748]">
									Bank Transfer
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-10 pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#718096]">
					<p>© {new Date().getFullYear()} Chakki.pk. All rights reserved.</p>
					<div className="flex items-center gap-4">
						<Link href="/terms" className="hover:text-[#7EB338]">
							Terms of Service
						</Link>
						<Link href="/shipping" className="hover:text-[#7EB338]">
							Shipping Policy
						</Link>
						<Link href="/returns" className="hover:text-[#7EB338]">
							Return Policy
						</Link>
					</div>
				</div>
			</div>
		</footer>
	)
}
