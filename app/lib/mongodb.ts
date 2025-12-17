import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI as string

if (!MONGODB_URI) {
	console.warn('MONGODB_URI is not set. Please add it to your .env.local')
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
		}).then((m) => m).catch((err) => {
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
