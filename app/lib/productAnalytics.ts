import { connectToDatabase } from './mongodb'
import Product from '@/models/Product'
import Order from '@/models/Order'
import POSale from '@/models/POSale'

/**
 * Update product analytics when an order is placed
 * This should be called after an order is successfully created
 */
export async function updateProductAnalyticsFromOrder(orderItems: Array<{ productId: string; variantId?: string; quantity: number; unitPrice: number }>) {
	try {
		await connectToDatabase()
		
		// Group items by productId
		const productMap = new Map<string, { quantity: number; revenue: number }>()
		
		for (const item of orderItems) {
			const productId = item.productId
			if (!productId) continue
			
			const quantity = item.quantity || 0
			const revenue = quantity * (item.unitPrice || 0)
			
			if (productMap.has(productId)) {
				const existing = productMap.get(productId)!
				existing.quantity += quantity
				existing.revenue += revenue
			} else {
				productMap.set(productId, { quantity, revenue })
			}
		}
		
		// Update each product's analytics
		for (const [productId, stats] of productMap.entries()) {
			await Product.updateOne(
				{ _id: productId },
				{
					$inc: {
						totalSales: stats.quantity,
						totalRevenue: stats.revenue,
					},
					$set: {
						lastSoldAt: new Date(),
					}
				}
			)
		}
		
		// Update recent sales (last 7 days) - this will be recalculated periodically
		await updateRecentSalesAnalytics()
	} catch (error) {
		console.error('Error updating product analytics from order:', error)
	}
}

/**
 * Update product analytics from POS sale
 */
export async function updateProductAnalyticsFromPOSale(saleItems: Array<{ productId: string; variantId?: string; quantity: number; unitPrice: number }>) {
	try {
		await connectToDatabase()
		
		// Group items by productId
		const productMap = new Map<string, { quantity: number; revenue: number }>()
		
		for (const item of saleItems) {
			const productId = item.productId
			if (!productId) continue
			
			const quantity = item.quantity || 0
			const revenue = quantity * (item.unitPrice || 0)
			
			if (productMap.has(productId)) {
				const existing = productMap.get(productId)!
				existing.quantity += quantity
				existing.revenue += revenue
			} else {
				productMap.set(productId, { quantity, revenue })
			}
		}
		
		// Update each product's analytics
		for (const [productId, stats] of productMap.entries()) {
			await Product.updateOne(
				{ _id: productId },
				{
					$inc: {
						totalSales: stats.quantity,
						totalRevenue: stats.revenue,
					},
					$set: {
						lastSoldAt: new Date(),
					}
				}
			)
		}
		
		// Update recent sales (last 7 days)
		await updateRecentSalesAnalytics()
	} catch (error) {
		console.error('Error updating product analytics from POS sale:', error)
	}
}

/**
 * Recalculate recent sales (last 7 days) for all products
 * This should be run periodically (e.g., via cron job or on-demand)
 */
export async function updateRecentSalesAnalytics() {
	try {
		await connectToDatabase()
		
		const sevenDaysAgo = new Date()
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
		
		// Get all products
		const products = await Product.find({}).select('_id').lean()
		
		for (const product of products) {
			const productId = String(product._id)
			
			// Get full product to access lastSoldAt
			const fullProduct = await Product.findById(productId).lean()
			if (!fullProduct) continue
			
			// Calculate recent sales from orders
			const recentOrders = await Order.find({
				'items.productId': productId,
				status: { $ne: 'CANCELLED' },
				createdAt: { $gte: sevenDaysAgo }
			}).lean()
			
			let recentSales = 0
			let recentRevenue = 0
			
			for (const order of recentOrders) {
				for (const item of order.items || []) {
					if (String(item.productId) === productId) {
						recentSales += item.quantity || 0
						recentRevenue += (item.quantity || 0) * (item.unitPrice || 0)
					}
				}
			}
			
			// Calculate recent sales from POS sales
			const recentPOSales = await POSale.find({
				'items.productId': productId,
				createdAt: { $gte: sevenDaysAgo }
			}).lean()
			
			for (const sale of recentPOSales) {
				for (const item of sale.items || []) {
					if (String(item.productId) === productId) {
						recentSales += item.quantity || 0
						recentRevenue += (item.quantity || 0) * (item.unitPrice || 0)
					}
				}
			}
			
			// Calculate trending score (recent sales velocity + recency factor)
			const lastSoldAt = (fullProduct as any).lastSoldAt
			const daysSinceLastSale = lastSoldAt 
				? Math.floor((Date.now() - new Date(lastSoldAt).getTime()) / (1000 * 60 * 60 * 24))
				: 999
			
			const recencyFactor = daysSinceLastSale <= 1 ? 1.5 : daysSinceLastSale <= 3 ? 1.2 : daysSinceLastSale <= 7 ? 1.0 : 0.5
			const trendingScore = recentSales * recencyFactor
			
			// Update product
			await Product.updateOne(
				{ _id: productId },
				{
					$set: {
						recentSales,
						recentRevenue,
						trendingScore,
					}
				}
			)
		}
	} catch (error) {
		console.error('Error updating recent sales analytics:', error)
	}
}

/**
 * Increment product view count
 */
export async function incrementProductView(productId: string) {
	try {
		await connectToDatabase()
		await Product.updateOne(
			{ _id: productId },
			{ $inc: { viewCount: 1 } }
		)
	} catch (error) {
		console.error('Error incrementing product view:', error)
	}
}

