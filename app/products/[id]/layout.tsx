import type { Metadata } from 'next'
import { connectToDatabase } from '@/app/lib/mongodb'
import Product from '@/models/Product'
import { getBaseUrl } from '@/app/lib/url'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> | { id: string } }): Promise<Metadata> {
	try {
		await connectToDatabase()
		const resolvedParams = params instanceof Promise ? await params : params
		const raw = resolvedParams.id
		
		let product: any = null
		
		// Accept either Mongo ObjectId or slug
		if (/^[0-9a-fA-F]{24}$/.test(raw)) {
			const found = await Product.findById(raw).lean()
			if (found && !Array.isArray(found)) product = found
		}
		if (!product) {
			const found = await Product.findOne({ slug: raw }).lean()
			if (found && !Array.isArray(found)) product = found
		}
		
		if (!product) {
			return {
				title: 'Product Not Found | Chakki',
				description: 'Wholesale food grains and daily essentials at the best bulk prices in Pakistan.',
			}
		}
		
		const baseUrl = getBaseUrl()
		const productUrl = `${baseUrl}/products/${product.slug || (product._id || product.id)}`
		
		// Get product image - use first image if available and it's a URL (not base64)
		let productImage = `${baseUrl}/icon.png` // Default to logo
		if (product.images?.[0]) {
			const firstImage = product.images[0]
			if (firstImage.startsWith('http')) {
				productImage = firstImage // Already absolute URL
			} else if (!firstImage.startsWith('data:') && firstImage.startsWith('/')) {
				productImage = `${baseUrl}${firstImage}` // Relative path - make absolute
			} else if (!firstImage.startsWith('data:')) {
				productImage = `${baseUrl}/${firstImage.replace(/^\//, '')}` // Path without leading slash
			}
		}
		
		const productTitle = product.title || 'Product'
		const productDescription = product.description 
			? product.description.substring(0, 200).replace(/\n/g, ' ').trim() 
			: 'Wholesale food grains and daily essentials at the best bulk prices in Pakistan.'
		
		return {
			title: `${productTitle} | Chakki`,
			description: productDescription,
			openGraph: {
				title: productTitle,
				description: productDescription,
				url: productUrl,
				siteName: 'Chakki',
				images: [
					{
						url: productImage,
						width: 1200,
						height: 630,
						alt: productTitle,
					}
				],
				type: 'website',
			},
			twitter: {
				card: 'summary_large_image',
				title: productTitle,
				description: productDescription,
				images: [productImage],
			},
		}
	} catch (error) {
		console.error('Error generating metadata:', error)
		return {
			title: 'Product | Chakki',
			description: 'Wholesale food grains and daily essentials at the best bulk prices in Pakistan.',
		}
	}
}

export default function ProductLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <>{children}</>
}

