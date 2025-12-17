import Link from 'next/link'

export default function ReturnsPage() {
	return (
		<div className="container-pg py-8">
			<h1 className="text-2xl font-semibold">Returns & Refunds</h1>

			<div className="mt-6 space-y-6 text-slate-700">
				<p>
					At Chakki.pk, your satisfaction is our priority. If you are not entirely satisfied with your purchase,
					we're here to help with our return and refund policy.
				</p>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Eligibility for Returns</h2>
					<ul className="list-disc list-inside space-y-1">
						<li>Items must be returned within <strong>7 days</strong> of delivery.</li>
						<li>Items must be unused, unopened, and in their original packaging.</li>
						<li>Perishable goods (e.g., fresh produce) are generally not eligible for return unless damaged or incorrect upon delivery.</li>
						<li>Proof of purchase (order ID or receipt) is required.</li>
					</ul>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">How to Initiate a Return</h2>
					<p>
						To initiate a return, please contact our customer support team within the eligible return period.
						You can reach us via:
					</p>
					<ul className="list-disc list-inside space-y-1 mt-2">
						<li>Phone: <a href="tel:03393399393" className="text-brand-accent hover:underline">03393399393</a></li>
						<li>Email: <a href="mailto:info@chakki.pk" className="text-brand-accent hover:underline">info@chakki.pk</a></li>
						<li>WhatsApp: <a href="https://wa.me/923393399393" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">923393399393</a></li>
					</ul>
					<p className="mt-2">
						Please provide your order ID and a detailed reason for the return. Our team will guide you through the next steps.
					</p>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Refund Process</h2>
					<p>
						Once your return is received and inspected, we will send you an email to notify you that we have received your returned item.
						We will also notify you of the approval or rejection of your refund.
					</p>
					<p className="mt-2">
						If approved, your refund will be processed, and a credit will automatically be applied to your original method of payment,
						within a certain amount of days (typically 5-10 business days).
					</p>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Exchanges</h2>
					<p>
						We only replace items if they are defective or damaged. If you need to exchange it for the same item,
						contact us using the details above.
					</p>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Shipping Costs for Returns</h2>
					<p>
						You will be responsible for paying for your own shipping costs for returning your item. Shipping costs are non-refundable.
						If you receive a refund, the cost of return shipping will be deducted from your refund.
					</p>
				</section>
			</div>
		</div>
	)
}

