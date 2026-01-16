import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI as string

if (!MONGODB_URI) {
	if (process.env.NODE_ENV !== 'production') {
		console.warn('MONGODB_URI is not set. Please add it to your .env.local')
	}
}

// Log database connection info only in development (without exposing full connection string)
if (process.env.NODE_ENV !== 'production' && MONGODB_URI) {
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
		console.log('⚠️  [MongoDB] Connecting to unknown database location')
	}
}

let cached = (global as any).mongoose

if (!cached) {
	cached = (global as any).mongoose = { conn: null, promise: null }
}

export async function connectToDatabase() {
	if (cached.conn) return cached.conn as typeof mongoose
	if (!cached.promise) {
		cached.promise = mongoose.connect(MONGODB_URI!, { 
			dbName: process.env.MONGODB_DB || undefined,
			serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
		}).then((m) => {
			if (process.env.NODE_ENV !== 'production') {
				const dbName = m.connection.db?.databaseName || process.env.MONGODB_DB || 'unknown'
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
