import mongoose from 'mongoose'

let cached = (global as any).mongoose

if (!cached) {
	cached = (global as any).mongoose = { conn: null, promise: null }
}

export async function connectToDatabase() {
	const MONGODB_URI = process.env.MONGODB_URI || (process.env.NODE_ENV !== 'production' ? 'mongodb://127.0.0.1:27017/chakki_pk' : '')

	if (!MONGODB_URI) {
		throw new Error(
			'Please define the MONGODB_URI environment variable inside .env.local or environment settings.'
		)
	}

	if (cached.conn) {
		return cached.conn as typeof mongoose
	}

	if (!cached.promise) {
		if (process.env.NODE_ENV !== 'production') {
			const uriLower = MONGODB_URI.toLowerCase()
			if (uriLower.includes('localhost') || uriLower.includes('127.0.0.1')) {
				console.log('✅ [MongoDB] Connecting to LOCAL database')
			} else if (uriLower.includes('mongodb.net') || uriLower.includes('mongodb.com')) {
				console.log('⚠️  [MongoDB] Connecting to MongoDB Atlas (cloud)')
			} else if (uriLower.includes('chakki.pk') || uriLower.includes('vps') || uriLower.includes('hostinger')) {
				console.error('❌ [MongoDB] WARNING: Connecting to VPS/PRODUCTION database!')
				console.error('   This should only be used in production. For local development, use:')
				console.error('   MONGODB_URI=mongodb://localhost:27017/chakki_pk')
			} else {
				console.log('⚠️  [MongoDB] Connecting to database')
			}
		}

		cached.promise = mongoose.connect(MONGODB_URI, { 
			dbName: process.env.MONGODB_DB || 'chakki_pk',
			serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
		}).then((m) => {
			if (process.env.NODE_ENV !== 'production') {
				const dbName = m.connection.db?.databaseName || process.env.MONGODB_DB || 'chakki_pk'
				console.log(`✅ [MongoDB] Connected to database: ${dbName}`)
			}
			return m
		}).catch((err) => {
			// Clear the promise on error so we can retry
			cached.promise = null
			console.error('MongoDB connection error:', err.message)
			if (err.message?.includes('whitelist')) {
				console.error('⚠️  Your IP address is not whitelisted in MongoDB Atlas.')
				console.error('   Please add your IP to the Network Access list: https://www.mongodb.com/docs/atlas/security-whitelist/')
			}
			throw err
		})
	}

	cached.conn = await cached.promise
	return cached.conn
}

