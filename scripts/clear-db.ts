/**
 * Script to clear all data from local database
 * WARNING: This will delete ALL data from your local database!
 * 
 * Usage: npm run clear-db
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local or .env
config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

import mongoose from 'mongoose'
import Product from '../models/Product'
import Category from '../models/Category'
import User from '../models/User'
import Order from '../models/Order'
import Cart from '../models/Cart'
import Wishlist from '../models/Wishlist'
import Review from '../models/Review'
import Request from '../models/Request'

async function clearDatabase() {
	try {
		const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chakki_pk'
		if (!MONGODB_URI) {
			throw new Error('MONGODB_URI not set in environment variables')
		}
		
		// Check if it's localhost BEFORE connecting
		if (!MONGODB_URI.includes('localhost') && !MONGODB_URI.includes('127.0.0.1')) {
			console.error('❌ ERROR: This script only works with local databases!')
			console.error('   Your MONGODB_URI does not point to localhost.')
			console.error('   Current URI starts with:', MONGODB_URI.substring(0, 30) + '...')
			process.exit(1)
		}
		
		console.log('🔄 Connecting to database...')
		await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || 'chakki_pk' })
		
		const db = mongoose.connection.db
		if (!db) {
			throw new Error('Database connection failed')
		}
		
		const dbName = db.databaseName
		console.log(`📦 Connected to database: ${dbName}`)
		
		console.log('\n⚠️  WARNING: This will delete ALL data from your local database!')
		console.log('   Database:', dbName)
		console.log('   Models to clear: Products, Categories, Users, Orders, Carts, Wishlists, Reviews, Requests\n')
		
		// Count existing data
		const counts = {
			products: await Product.countDocuments(),
			categories: await Category.countDocuments(),
			users: await User.countDocuments(),
			orders: await Order.countDocuments(),
			carts: await Cart.countDocuments(),
			wishlists: await Wishlist.countDocuments(),
			reviews: await Review.countDocuments(),
			requests: await Request.countDocuments(),
		}
		
		console.log('📊 Current data counts:')
		Object.entries(counts).forEach(([model, count]) => {
			console.log(`   ${model}: ${count}`)
		})
		
		console.log('\n🗑️  Deleting all data...')
		
		// Delete all documents
		await Promise.all([
			Product.deleteMany({}),
			Category.deleteMany({}),
			User.deleteMany({}),
			Order.deleteMany({}),
			Cart.deleteMany({}),
			Wishlist.deleteMany({}),
			Review.deleteMany({}),
			Request.deleteMany({}),
		])
		
		console.log('✅ All data cleared successfully!')
		console.log('\n💡 Next steps:')
		console.log('   1. Run "npm run seed" to add sample products')
		console.log('   2. Or add your own products via the admin panel')
		console.log('   3. Create categories via /admin/categories')
		
		await mongoose.disconnect()
		process.exit(0)
	} catch (error: any) {
		console.error('❌ Error clearing database:', error.message)
		process.exit(1)
	}
}

clearDatabase()

