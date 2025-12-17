import Link from 'next/link'

export default function ShippingPage() {
	return (
		<div className="container-pg py-8">
			<h1 className="text-2xl font-semibold">Shipping & Delivery</h1>

			<div className="mt-6 space-y-6 text-slate-700">
				<p>
					At Chakki.pk, we strive to deliver your wholesale grains and essentials efficiently and reliably.
					Here's what you need to know about our shipping and delivery process.
				</p>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Delivery Areas</h2>
					<p>
						We currently deliver across major cities in Pakistan. Please check if your area is covered during the checkout process.
					</p>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Delivery Times</h2>
					<ul className="list-disc list-inside space-y-1">
						<li><strong>Major Cities (Lahore, Karachi, Islamabad, Rawalpindi):</strong> 1-3 business days</li>
						<li><strong>Other Cities:</strong> 3-5 business days</li>
					</ul>
					<p className="mt-2">
						Delivery times are estimates and may vary due to unforeseen circumstances such as weather conditions, public holidays, or logistical challenges.
					</p>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Shipping Charges</h2>
					<p>
						A standard delivery fee of Rs. 200 applies to all orders.
						First-time Cash on Delivery (COD) orders may qualify for free delivery as part of our promotional offers.
					</p>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Order Processing</h2>
					<p>
						Orders are processed and dispatched within 24-48 hours of placement. You will receive a confirmation email with tracking details once your order has been shipped.
					</p>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Tracking Your Order</h2>
					<p>
						You can easily track the status of your order by visiting our <Link href="/orders" className="text-brand-accent hover:underline">Track Your Order</Link> page and entering your Order ID or phone number.
					</p>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">Receiving Your Order</h2>
					<p>
						Please ensure someone is available to receive and sign for the delivery at the provided shipping address. If you are unavailable, our delivery partner may attempt redelivery or contact you to reschedule.
					</p>
				</section>
			</div>
		</div>
	)
}

