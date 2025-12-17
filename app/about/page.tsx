import Link from 'next/link'

export default function AboutPage() {
	return (
		<div className="container-pg py-8">
			<h1 className="text-2xl font-semibold">About Chakki.pk</h1>

			<div className="mt-6 space-y-6 text-slate-700">
				<p>
					Welcome to Chakki.pk, your trusted source for high-quality wholesale grains and daily essentials in Pakistan.
					We are committed to providing businesses and households with premium products at competitive bulk prices,
					ensuring freshness, purity, and timely delivery.
				</p>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Our Mission</h2>
					<p>
						Our mission is to simplify the procurement of essential food items for our customers. We aim to bridge the gap
						between quality producers and consumers by offering a seamless online platform for bulk purchases,
						backed by exceptional service and transparent pricing.
					</p>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">What We Offer</h2>
					<ul className="list-disc list-inside space-y-1">
						<li><strong>Premium Quality Grains:</strong> A wide selection of fresh, unadulterated grains sourced directly from trusted farms.</li>
						<li><strong>Daily Essentials:</strong> Beyond grains, we provide a range of other essential food items to meet your daily needs.</li>
						<li><strong>Wholesale Pricing:</strong> Enjoy significant savings with our competitive bulk pricing model.</li>
						<li><strong>Convenient Delivery:</strong> Fast and reliable delivery services across major cities in Pakistan.</li>
						<li><strong>Customer Satisfaction:</strong> Dedicated support to ensure a smooth shopping experience from order to delivery.</li>
					</ul>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Our Values</h2>
					<ul className="list-disc list-inside space-y-1">
						<li><strong>Quality:</strong> We never compromise on the quality and freshness of our products.</li>
						<li><strong>Integrity:</strong> Honest and transparent dealings with all our customers and partners.</li>
						<li><strong>Reliability:</strong> Ensuring consistent supply and dependable delivery.</li>
						<li><strong>Customer Focus:</strong> Prioritizing customer needs and striving for their complete satisfaction.</li>
					</ul>
				</section>

				<p className="mt-6">
					Thank you for choosing Chakki.pk. We look forward to serving you!
				</p>
			</div>
		</div>
	)
}

