import { z } from 'zod'

// Shared
export const idParamSchema = z.object({ id: z.string().min(1) })

// Products
export const productsQuerySchema = z.object({
	q: z.string().optional(),
	category: z.string().optional(),
	subCategory: z.string().optional(),
	brand: z.string().optional(),
	minPrice: z.coerce.number().optional(),
	maxPrice: z.coerce.number().optional(),
	inStock: z.coerce.boolean().optional(),
	sort: z.enum(['price_asc', 'price_desc', 'popularity', 'newest']).optional(),
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(40).default(20)
})

export const productCreateSchema = z.object({
	slug: z.string().min(1),
	title: z.string().min(1),
	description: z.string().min(1),
	brand: z.string().optional(),
	category: z.string().optional(),
	subCategory: z.string().optional(),
	subSubCategory: z.string().optional(),
	badges: z.array(z.string()).default([]),
	// allow absolute URLs or /public paths
	images: z.array(z.union([z.string().url(), z.string().regex(/^\/.+/, { message: 'must be a /public path or full URL' })])).default([]),
	moq: z.number().min(1).default(1),
	inStock: z.boolean().default(true),
	variants: z.array(z.object({
		label: z.string(),
		unitWeight: z.number().positive(),
		sku: z.string(),
		pricePerKg: z.number().int().nonnegative(),
		stockQty: z.number().int().nonnegative()
	})).min(1),
	tiers: z.array(z.object({
		minQty: z.number().int().min(1),
		maxQty: z.number().int().nullable().optional(),
		pricePerKg: z.number().int().nonnegative()
	})).optional().default([]),
	relatedProducts: z.array(z.string()).optional().default([])
})

export const productUpdateSchema = productCreateSchema.partial()

// Cart
export const addToCartSchema = z.object({
	productId: z.string(),
	variantId: z.string().optional(),
	quantity: z.number().int().min(1)
})

export const updateCartItemSchema = z.object({
	itemId: z.string(),
	quantity: z.number().int().min(1)
})

// Orders
export const createOrderSchema = z.object({
	paymentMethod: z.enum(['COD', 'JAZZCASH', 'EASYPAISA']),
	deliveryType: z.enum(['STANDARD', 'EXPRESS']).optional(),
	shippingName: z.string().min(2),
	shippingPhone: z.string().min(7),
	shippingAddress: z.string().min(6),
	city: z.string().min(2),
	coupon: z.string().optional(),
	jazzcashAccountName: z.string().optional(),
	jazzcashAccountNumber: z.string().optional(),
	easypaisaAccountName: z.string().optional(),
	easypaisaAccountNumber: z.string().optional()
})

// Payments
export const jazzcashCreateSchema = z.object({
	amount: z.number().int().positive(),
	orderId: z.string()
})

export const jazzcashUpdateSchema = z.object({
	status: z.enum(['PENDING', 'PAID', 'FAILED'])
})

// Auth validators
export const emailSchema = z.string().email('Invalid email address').min(1, 'Email is required')

export const passwordSchema = z.string()
	.min(8, 'Password must be at least 8 characters')
	.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
	.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
	.regex(/[0-9]/, 'Password must contain at least one number')
	.regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, 'Password is required')
})

export const signupSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
	email: emailSchema,
	password: passwordSchema
})

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, 'Current password is required'),
	newPassword: passwordSchema
}).refine((data) => data.currentPassword !== data.newPassword, {
	message: 'New password must be different from current password',
	path: ['newPassword']
})

// Standard API response
export const apiResponse = <T extends z.ZodTypeAny>(data: T) => z.object({
	success: z.boolean(),
	message: z.string(),
	data: data.optional(),
	errors: z.record(z.any()).optional()
})
