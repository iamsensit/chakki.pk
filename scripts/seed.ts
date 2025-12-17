import mongoose from 'mongoose'
import Product from '@/models/Product'

const MONGODB_URI = process.env.MONGODB_URI as string

const brands = ['Chakki Select', 'Punjab Mills', 'Harvest Gold', 'Daily Essentials']
const categories = ['Flour', 'Rice', 'Pulses', 'Spices']

function rupees(n: number) { return Math.round(n) }

async function main() {
	if (!MONGODB_URI) throw new Error('MONGODB_URI not set')
	await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || undefined })
	console.log('Seeding database (Mongo)...')

	const productsData = Array.from({ length: 40 }).map((_, idx) => {
		const category = categories[idx % categories.length]
		const base = 150 + (idx % 10) * 10
		const title = `${category} Product ${idx + 1}`
		const slug = `${category.toLowerCase()}-${idx + 1}`.replace(/\s+/g, '-')
		const brand = brands[idx % brands.length]
		return {
			slug,
			title,
			description: `${title} description for wholesale buyers with great quality and freshness.`,
			brand,
			category,
			badges: ['Wholesale', 'In Stock'],
			images: ['/placeholder.png'],
			moq: 1,
			inStock: true,
			variants: [
				{ label: '5kg bag', unitWeight: 5, sku: `${slug}-5`, pricePerKg: rupees(base), stockQty: 200 },
				{ label: '10kg bag', unitWeight: 10, sku: `${slug}-10`, pricePerKg: rupees(base - 5), stockQty: 150 },
				{ label: '20kg bag', unitWeight: 20, sku: `${slug}-20`, pricePerKg: rupees(base - 10), stockQty: 100 },
			],
			tiers: [
				{ minQty: 1, maxQty: 10, pricePerKg: rupees(base) },
				{ minQty: 11, maxQty: 50, pricePerKg: rupees(base - 8) },
				{ minQty: 51, maxQty: null, pricePerKg: rupees(base - 14) },
			],
		}
	})

	for (const data of productsData) {
		await Product.updateOne({ slug: data.slug }, { $setOnInsert: data }, { upsert: true })
	}

	console.log('Seed complete')
	await mongoose.disconnect()
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
