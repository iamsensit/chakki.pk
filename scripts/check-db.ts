/**
 * Script to check what's in the local database
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

import mongoose from 'mongoose'
import Product from '../models/Product'
import Category from '../models/Category'

async function checkDatabase() {
	try {
		const MONGODB_URI = process.env.MONGODB_URI as string
		if (!MONGODB_URI) {
			throw new Error('MONGODB_URI not set in environment variables')
		}
		
		console.log('🔄 Connecting to database...')
		console.log('   URI starts with:', MONGODB_URI.substring(0, 30) + '...')
		
		if (!MONGODB_URI.includes('localhost') && !MONGODB_URI.includes('127.0.0.1')) {
			console.error('❌ WARNING: Not connected to localhost!')
			console.error('   This might be connecting to VPS/production database')
		} else {
			console.log('✅ Connected to LOCAL database')
		}
		
		await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || undefined })
		
		const db = mongoose.connection.db
		if (!db) {
			throw new Error('Database connection failed')
		}
		
		const dbName = db.databaseName
		console.log(`📦 Database name: ${dbName}\n`)
		
		// Get all products
		const products = await Product.find({}).lean()
		console.log(`📦 Products in database: ${products.length}`)
		products.forEach((p: any, idx: number) => {
			console.log(`   ${idx + 1}. ${p.title || 'No title'} (ID: ${p._id})`)
			console.log(`      Category: ${p.category || 'None'}`)
			console.log(`      Brand: ${p.brand || 'None'}`)
			console.log(`      Slug: ${p.slug || 'None'}`)
		})
		
		// Get all categories
		const categories = await Category.find({}).lean()
		console.log(`\n📁 Categories in database: ${categories.length}`)
		categories.forEach((c: any, idx: number) => {
			console.log(`   ${idx + 1}. ${c.name || 'No name'} (ID: ${c._id})`)
		})
		
		await mongoose.disconnect()
		process.exit(0)
	} catch (error: any) {
		console.error('❌ Error checking database:', error.message)
		process.exit(1)
	}
}

checkDatabase()

