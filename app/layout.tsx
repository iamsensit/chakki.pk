import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'
import Header from '@/app/components/layout/Header'
import MobileHeader from '@/app/components/layout/MobileHeader'
import MobileBottomNav from '@/app/components/layout/MobileBottomNav'
import Footer from '@/app/components/layout/Footer'
import { Toaster } from 'sonner'
import StructuredData from '@/app/components/SEO/StructuredData'
import CartSync from '@/app/components/cart/CartSync'
import LocationSync from '@/app/components/layout/LocationSync'
import RouteLoader from '@/app/components/layout/RouteLoader'
import { ErrorDialogProvider } from '@/app/contexts/ErrorDialogContext'
import FontPreload from '@/app/components/layout/FontPreload'

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
	title: {
		default: 'Chakki — Wholesale Grains & Essentials',
		template: '%s | Chakki'
	},
	description: 'Wholesale food grains and daily essentials at the best bulk prices in Pakistan.',
	keywords: ['wholesale grains', 'food essentials', 'bulk pricing', 'Pakistan', 'Chakki'],
	authors: [{ name: 'Chakki.pk' }],
	openGraph: {
		title: 'Chakki — Wholesale Grains & Essentials',
		description: 'Wholesale food grains and daily essentials at the best bulk prices in Pakistan.',
		siteName: 'Chakki',
		type: 'website',
		images: [{ url: '/icon.png', width: 512, height: 512, alt: 'Chakki Logo' }]
	},
	twitter: {
		card: 'summary',
		title: 'Chakki — Wholesale Grains & Essentials',
		description: 'Wholesale food grains and daily essentials at the best bulk prices in Pakistan.',
		images: ['/icon.png']
	},
	icons: {
		icon: [
			{ url: '/icon.png', sizes: '192x192', type: 'image/png' },
			{ url: '/icon.png', sizes: '512x512', type: 'image/png' },
		],
		apple: [
			{ url: '/icon.png', sizes: '180x180', type: 'image/png' },
		],
		shortcut: [
			{ url: '/icon.png', sizes: '192x192', type: 'image/png' },
		],
	},
	manifest: '/manifest.json',
	appleWebApp: {
		capable: true,
		statusBarStyle: 'default',
		title: 'چَکّی',
	},
}

export const viewport: Viewport = {
	themeColor: '#F4991A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="h-full">
			<body className="min-h-full antialiased bg-white text-slate-900">
				<FontPreload />
				<StructuredData />
				<Providers>
					<ErrorDialogProvider>
						<Header />
						<MobileHeader />
						<MobileBottomNav />
						<CartSync />
						<LocationSync />
						<div className="pb-16 md:pb-0">
							{children}
						</div>
						<Footer />
						<RouteLoader />
						<Toaster 
							position="top-right" 
							duration={1000}
							toastOptions={{
								classNames: {
									toast: 'bg-white border border-gray-200 shadow-lg',
									title: 'text-brand-accent font-medium',
									description: 'text-gray-600',
									success: 'bg-white',
									error: 'bg-white',
									info: 'bg-white',
									warning: 'bg-white',
								},
								style: {
									background: 'white',
									color: '#F4991A',
								},
							}}
						/>
					</ErrorDialogProvider>
				</Providers>
			</body>
		</html>
	)
}
