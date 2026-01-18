/**
 * Automatically enhances product metadata for SEO
 * Improves description, generates meta descriptions, and optimizes content
 */

export interface SEOEnhancement {
	description?: string // Enhanced description
	metaDescription?: string // SEO meta description (150-160 chars)
	metaKeywords?: string[] // SEO keywords
	seoTags?: string[] // Additional SEO tags
}

/**
 * Enhances product description and generates SEO metadata
 */
export function enhanceProductSEO(product: {
	title: string
	description?: string
	brand?: string
	category?: string
	subCategory?: string
	subSubCategory?: string
	variants?: Array<{ label?: string; unitWeight?: number; unit?: string }>
}): SEOEnhancement {
	const { title, description = '', brand, category, subCategory, subSubCategory, variants = [] } = product

	// Extract keywords from product data
	const keywords: string[] = []
	if (title) keywords.push(...title.toLowerCase().split(/\s+/).filter(w => w.length > 2))
	if (brand) keywords.push(brand.toLowerCase())
	if (category) keywords.push(category.toLowerCase())
	if (subCategory) keywords.push(subCategory.toLowerCase())
	if (subSubCategory) keywords.push(subSubCategory.toLowerCase())

	// Add variant information as keywords
	variants.forEach(v => {
		if (v.label) {
			const labelWords = v.label.toLowerCase().split(/\s+/).filter(w => w.length > 1)
			keywords.push(...labelWords)
		}
		if (v.unit) keywords.push(v.unit.toLowerCase())
	})

	// Remove duplicates and common stop words
	const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'kg', 'g', 'l', 'ml'])
	const uniqueKeywords = Array.from(new Set(keywords.filter(k => !stopWords.has(k) && k.length > 2)))

	// Enhance description - if description is short, expand it with context
	let enhancedDescription = description.trim()

	if (!enhancedDescription || enhancedDescription.length < 50) {
		// If description is missing or too short, create one from product info
		const parts: string[] = []
		
		if (brand) parts.push(brand)
		parts.push(title)
		
		const categories = [category, subCategory, subSubCategory].filter(Boolean).join(' - ')
		if (categories) parts.push(`in the ${categories} category`)
		
		if (variants.length > 0) {
			const variantInfo = variants
				.map(v => {
					const weight = v.unitWeight || 1
					const unit = v.unit === 'kg' ? 'KG' : v.unit === 'g' ? 'g' : v.unit === 'l' ? 'L' : v.unit === 'ml' ? 'ml' : v.unit || ''
					return `${weight} ${unit}`
				})
				.join(', ')
			if (variantInfo) parts.push(`Available in ${variantInfo}`)
		}
		
		parts.push('Premium quality product for your kitchen needs.')
		
		enhancedDescription = parts.join('. ') + '.'
	} else if (enhancedDescription.length < 100) {
		// If description exists but is short, enhance it with additional context
		const parts: string[] = [enhancedDescription]
		
		if (brand && !enhancedDescription.toLowerCase().includes(brand.toLowerCase())) {
			parts.push(`From ${brand}`)
		}
		
		if (variants.length > 0) {
			const variantInfo = variants
				.map(v => {
					const weight = v.unitWeight || 1
					const unit = v.unit === 'kg' ? 'KG' : v.unit === 'g' ? 'g' : v.unit === 'l' ? 'L' : v.unit === 'ml' ? 'ml' : v.unit || ''
					return `${weight} ${unit}`
				})
				.join(', ')
			if (variantInfo && !enhancedDescription.toLowerCase().includes(variantInfo.toLowerCase())) {
				parts.push(`Available in ${variantInfo}`)
			}
		}
		
		enhancedDescription = parts.join('. ') + '.'
	}

	// Generate meta description (150-160 characters, optimized for SEO)
	let metaDescription = enhancedDescription
		.replace(/\n+/g, ' ') // Replace line breaks with spaces
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim()
	
	// Ensure meta description is between 120-160 characters for optimal SEO
	if (metaDescription.length > 160) {
		// Truncate at word boundary near 155 chars
		const truncated = metaDescription.substring(0, 155)
		const lastSpace = truncated.lastIndexOf(' ')
		metaDescription = (lastSpace > 120 ? truncated.substring(0, lastSpace) : truncated) + '...'
	} else if (metaDescription.length < 120) {
		// Extend if too short
		const categories = [category, subCategory].filter(Boolean).join(', ')
		if (categories && metaDescription.length < 100) {
			metaDescription = `${metaDescription} Available in ${categories}.`
		}
		// Still too short? Add brand or title
		if (metaDescription.length < 100 && brand) {
			metaDescription = `${brand} - ${metaDescription}`
		}
	}

	// Generate SEO tags (combination of categories, brand, and keywords)
	const seoTags: string[] = []
	if (category) seoTags.push(category)
	if (subCategory) seoTags.push(subCategory)
	if (subSubCategory) seoTags.push(subSubCategory)
	if (brand) seoTags.push(brand)
	// Add top keywords
	seoTags.push(...uniqueKeywords.slice(0, 5))

	return {
		description: enhancedDescription,
		metaDescription,
		metaKeywords: uniqueKeywords.slice(0, 10), // Top 10 keywords
		seoTags: Array.from(new Set(seoTags)), // Remove duplicates
	}
}

