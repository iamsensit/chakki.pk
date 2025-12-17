import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'
import Header from '@/app/components/layout/Header'
import Footer from '@/app/components/layout/Footer'
import { Toaster } from 'sonner'
import StructuredData from '@/app/components/SEO/StructuredData'
import CartSync from '@/app/components/cart/CartSync'
import LocationSync from '@/app/components/layout/LocationSync'
import RouteLoader from '@/app/components/layout/RouteLoader'
import { ErrorDialogProvider } from '@/app/contexts/ErrorDialogContext'

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
			{ url: '/icon.png', sizes: 'any', type: 'image/png' },
		],
		apple: [
			{ url: '/icon.png', sizes: '180x180', type: 'image/png' },
		],
	},
	manifest: '/manifest.json'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="h-full">
			<body className="min-h-full antialiased bg-white text-slate-900">
				<StructuredData />
				<Providers>
					<ErrorDialogProvider>
						<Header />
						<CartSync />
						<LocationSync />
						{children}
						<Footer />
						<RouteLoader />
						<Toaster richColors position="top-right" />
					</ErrorDialogProvider>
				</Providers>
			</body>
		</html>
	)
}
