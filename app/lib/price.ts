export type PriceTierLite = { minQty: number; maxQty: number | null; pricePerKg: number }
export type ProductVariantLite = { unitWeight: number; pricePerKg: number }

export type CalculatedPrice = {
	pricePerKg: number
	unitPrice: number // price per chosen variant unit (bag)
}

export function calculateBulkPrice(
	tiers: PriceTierLite[],
	totalBags: number,
	variant: ProductVariantLite
): CalculatedPrice {
	const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty)
	let matched = variant.pricePerKg
	for (const tier of sorted) {
		const withinMax = tier.maxQty == null || totalBags <= tier.maxQty
		if (totalBags >= tier.minQty && withinMax) {
			matched = tier.pricePerKg
		}
	}
	const pricePerKg = matched
	const unitPrice = Math.round(pricePerKg * variant.unitWeight)
	return { pricePerKg, unitPrice }
}

export function formatCurrencyPKR(amount: number | undefined | null): string {
	if (amount == null || isNaN(Number(amount))) {
		return 'Rs. 0'
	}
	return `Rs. ${Number(amount).toLocaleString('en-PK')}`
}

export function estimateDeliveryDays(city: string): string {
	if (!city) return '3-5 days'
	const fast = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi']
	return fast.includes(city) ? '1-3 days' : '3-5 days'
}

export function isFirstOrderCodFree(previousCodOrdersCount: number): boolean {
	return previousCodOrdersCount === 0 && process.env.COD_FREE_DELIVERY_FIRST_ORDER === 'true'
}

export function getCodDeliveryFee(previousCodOrdersCount: number): number {
	if (isFirstOrderCodFree(previousCodOrdersCount)) return 0
	const fee = Number(process.env.COD_DEFAULT_DELIVERY_FEE || '200')
	return Number.isFinite(fee) ? fee : 200
}
