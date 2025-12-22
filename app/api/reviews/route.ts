import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { connectToDatabase } from '@/app/lib/mongodb'
import Review from '@/models/Review'
import Order from '@/models/Order'

// GET - Fetch reviews for a product
export async function GET(request: NextRequest) {
	try {
		await connectToDatabase()
		const { searchParams } = new URL(request.url)
		const productId = searchParams.get('productId')
		let userId = searchParams.get('userId')

		if (productId) {
			// Get reviews for a specific product
			const reviews = await Review.find({ 
				productId, 
				status: 'APPROVED' 
			})
				.sort({ createdAt: -1 })
				.limit(50)
				.lean()

			// Calculate average rating
			const avgRating = reviews.length > 0
				? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
				: 0

			// Count ratings
			const ratingCounts = [1, 2, 3, 4, 5].map(rating => ({
				rating,
				count: reviews.filter(r => r.rating === rating).length
			}))

			return NextResponse.json({
				success: true,
				data: {
					reviews,
					averageRating: Math.round(avgRating * 10) / 10,
					totalReviews: reviews.length,
					ratingCounts
				}
			})
		}

		if (userId) {
			// Get reviews by a specific user
			const session = await auth()
			if (userId === 'current' && session?.user?.email) {
				userId = session.user.id || session.user.email
			}
			const reviews = await Review.find({ userId })
				.sort({ createdAt: -1 })
				.lean()
			return NextResponse.json({ success: true, data: reviews })
		}

		return NextResponse.json({ success: false, message: 'productId or userId required' }, { status: 400 })
	} catch (error: any) {
		console.error('Error fetching reviews:', error)
		return NextResponse.json({ success: false, message: error.message }, { status: 500 })
	}
}

// POST - Create a new review
export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
		}

		await connectToDatabase()
		const body = await request.json()
		const { productId, variantId, orderId, rating, comment, images } = body

		if (!productId || !rating || rating < 1 || rating > 5) {
			return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 })
		}

		// Check if user already reviewed this product
		const existingReview = await Review.findOne({
			userId: session.user.id || session.user.email,
			productId
		})

		if (existingReview) {
			return NextResponse.json({ 
				success: false, 
				message: 'You have already reviewed this product' 
			}, { status: 400 })
		}

		// Check if user actually purchased and order is shipped (if orderId provided)
		let verifiedPurchase = false
		if (orderId) {
			const order = await Order.findById(orderId).lean()
			if (order && !Array.isArray(order) && order.userId === (session.user.id || session.user.email)) {
				// Only allow reviews for shipped or delivered orders
				if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
					verifiedPurchase = true
				} else {
					return NextResponse.json({ 
						success: false, 
						message: 'You can only review products that have been shipped to you' 
					}, { status: 400 })
				}
			}
		}

		const review = new Review({
			userId: session.user.id || session.user.email,
			userName: session.user.name || 'Anonymous',
			userEmail: session.user.email,
			productId,
			variantId: variantId || null,
			orderId: orderId || null,
			rating,
			comment: comment || '',
			images: images || [],
			verifiedPurchase,
			status: 'APPROVED' // Auto-approve for now, can add moderation later
		})

		await review.save()

		return NextResponse.json({ success: true, data: review })
	} catch (error: any) {
		console.error('Error creating review:', error)
		return NextResponse.json({ success: false, message: error.message }, { status: 500 })
	}
}

// PUT - Update a review
export async function PUT(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
		}

		await connectToDatabase()
		const body = await request.json()
		const { reviewId, rating, comment, images } = body

		if (!reviewId) {
			return NextResponse.json({ success: false, message: 'reviewId required' }, { status: 400 })
		}

		const review = await Review.findById(reviewId)
		if (!review) {
			return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 })
		}

		// Check ownership
		if (review.userId !== (session.user.id || session.user.email)) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
		}

		if (rating !== undefined) review.rating = rating
		if (comment !== undefined) review.comment = comment
		if (images !== undefined) review.images = images

		await review.save()

		return NextResponse.json({ success: true, data: review })
	} catch (error: any) {
		console.error('Error updating review:', error)
		return NextResponse.json({ success: false, message: error.message }, { status: 500 })
	}
}

// DELETE - Delete a review
export async function DELETE(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
		}

		await connectToDatabase()
		const { searchParams } = new URL(request.url)
		const reviewId = searchParams.get('reviewId')

		if (!reviewId) {
			return NextResponse.json({ success: false, message: 'reviewId required' }, { status: 400 })
		}

		const review = await Review.findById(reviewId)
		if (!review) {
			return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 })
		}

		// Check ownership
		if (review.userId !== (session.user.id || session.user.email)) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
		}

		await Review.findByIdAndDelete(reviewId)

		return NextResponse.json({ success: true })
	} catch (error: any) {
		console.error('Error deleting review:', error)
		return NextResponse.json({ success: false, message: error.message }, { status: 500 })
	}
}

