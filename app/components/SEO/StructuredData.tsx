export default function StructuredData() {
	const orgData = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'Chakki',
		alternateName: 'Chakki.pk',
		url: process.env.NEXT_PUBLIC_BASE_URL || 'https://chakki.pk',
		logo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chakki.pk'}/logo.png`,
		description: 'Wholesale food grains and daily essentials at the best bulk prices in Pakistan.',
		sameAs: []
	}

	const websiteData = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Chakki',
		alternateName: 'Chakki.pk',
		url: process.env.NEXT_PUBLIC_BASE_URL || 'https://chakki.pk',
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chakki.pk'}/products?q={search_term_string}`
			},
			'query-input': 'required name=search_term_string'
		}
	}

	return (
		<>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgData) }} />
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }} />
		</>
	)
}

