import Link from 'next/link'
import { HelpCircle, ShoppingBag, Truck, CreditCard, RotateCcw, Shield, Package, Phone, Mail, MessageCircle } from 'lucide-react'

export default function HelpPage() {
	return (
		<div className="container-pg py-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
				<p className="text-gray-600 mb-8">Find answers to common questions about shopping with Chakki</p>

				<div className="space-y-6">
					{/* Shopping & Orders */}
					<section>
						<div className="flex items-center gap-3 mb-4">
							<ShoppingBag className="h-6 w-6 text-brand-accent" />
							<h2 className="text-2xl font-semibold text-gray-900">Shopping & Orders</h2>
						</div>
						<div className="space-y-4">
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">How do I place an order?</h3>
								<p className="text-gray-700">
									Browse our products, add items to your cart, and proceed to checkout. You can sign in or create an account to save your details for faster checkout. We accept Cash on Delivery (COD) and JazzCash payments.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">How can I track my order?</h3>
								<p className="text-gray-700">
									You can track your order using your Order ID or phone number on our <Link href="/orders" className="text-brand-accent hover:underline">Track Your Order</Link> page. You'll receive updates via email and SMS as your order is processed and shipped.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">Can I modify or cancel my order?</h3>
								<p className="text-gray-700">
									Orders can be modified or cancelled within 1 hour of placement. After that, please contact our customer service team at <a href="tel:03393399393" className="text-brand-accent hover:underline">03393399393</a> or email us at <a href="mailto:info@chakki.pk" className="text-brand-accent hover:underline">info@chakki.pk</a>.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">What payment methods do you accept?</h3>
								<p className="text-gray-700">
									We currently accept Cash on Delivery (COD) and JazzCash. More payment options are coming soon. For COD orders, payment is made when you receive your order.
								</p>
							</div>
						</div>
					</section>

					{/* Shipping & Delivery */}
					<section>
						<div className="flex items-center gap-3 mb-4">
							<Truck className="h-6 w-6 text-brand-accent" />
							<h2 className="text-2xl font-semibold text-gray-900">Shipping & Delivery</h2>
						</div>
						<div className="space-y-4">
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">What are your delivery charges?</h3>
								<p className="text-gray-700">
									Standard delivery charges are Rs. 200. First-time COD orders may qualify for free delivery as part of our promotional offers. Delivery charges are calculated at checkout.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">How long does delivery take?</h3>
								<p className="text-gray-700">
									Delivery times vary by location:
									<ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
										<li>Major cities (Lahore, Karachi, Islamabad, Rawalpindi): 1-3 business days</li>
										<li>Other cities: 3-5 business days</li>
									</ul>
									Orders are typically processed and dispatched within 24-48 hours.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">Do you deliver to my area?</h3>
								<p className="text-gray-700">
									We deliver across major cities in Pakistan. During checkout, you can check if your area is covered. If your area is not listed, please contact us and we'll do our best to accommodate your delivery needs.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">What if I'm not available to receive my order?</h3>
								<p className="text-gray-700">
									Our delivery partner will attempt to contact you. If you're unavailable, they may attempt redelivery or contact you to reschedule. Please ensure someone is available to receive and sign for the delivery.
								</p>
							</div>
						</div>
					</section>

					{/* Returns & Refunds */}
					<section>
						<div className="flex items-center gap-3 mb-4">
							<RotateCcw className="h-6 w-6 text-brand-accent" />
							<h2 className="text-2xl font-semibold text-gray-900">Returns & Refunds</h2>
						</div>
						<div className="space-y-4">
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">What is your return policy?</h3>
								<p className="text-gray-700">
									Items must be returned within 7 days of delivery. Items must be unused, unopened, and in their original packaging. Perishable goods are generally not eligible for return unless damaged or incorrect upon delivery. Please refer to our <Link href="/returns" className="text-brand-accent hover:underline">Returns & Refunds</Link> page for detailed information.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">How do I initiate a return?</h3>
								<p className="text-gray-700">
									Contact our customer support team within the eligible return period. Provide your order ID and a detailed reason for the return. Our team will guide you through the process and provide a return authorization if applicable.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">How long do refunds take?</h3>
								<p className="text-gray-700">
									Once your return is received and inspected, we'll send you an email notification. Refunds are typically processed within 5-10 business days and will be credited to your original payment method.
								</p>
							</div>
						</div>
					</section>

					{/* Product Information */}
					<section>
						<div className="flex items-center gap-3 mb-4">
							<Package className="h-6 w-6 text-brand-accent" />
							<h2 className="text-2xl font-semibold text-gray-900">Product Information</h2>
						</div>
						<div className="space-y-4">
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">Are your products fresh and authentic?</h3>
								<p className="text-gray-700">
									Yes, we source our products directly from trusted suppliers and farms. All products are stored in proper conditions to maintain freshness and quality. We guarantee the authenticity of all our products.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">Do you offer wholesale pricing?</h3>
								<p className="text-gray-700">
									Yes, we specialize in wholesale grains and essentials. Our pricing is designed to be competitive for bulk purchases. For large orders, please contact us for special pricing.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">What if a product is out of stock?</h3>
								<p className="text-gray-700">
									If a product is out of stock, you'll see an "Out of Stock" badge on the product page. You can sign up for email notifications to be alerted when the product is back in stock.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">Can I see product details before ordering?</h3>
								<p className="text-gray-700">
									Yes, each product page includes detailed information including images, descriptions, weight/volume, pricing, and stock availability. You can also view variant options if available.
								</p>
							</div>
						</div>
					</section>

					{/* Account & Security */}
					<section>
						<div className="flex items-center gap-3 mb-4">
							<Shield className="h-6 w-6 text-brand-accent" />
							<h2 className="text-2xl font-semibold text-gray-900">Account & Security</h2>
						</div>
						<div className="space-y-4">
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">How do I create an account?</h3>
								<p className="text-gray-700">
									You can create an account by clicking "Sign In" in the navigation and selecting "Sign Up". You can also sign up using your Google account for faster registration.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">How do I reset my password?</h3>
								<p className="text-gray-700">
									If you've forgotten your password, click "Sign In" and then "Forgot Password". You'll receive an email with instructions to reset your password.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">Is my personal information secure?</h3>
								<p className="text-gray-700">
									Yes, we take your privacy and security seriously. All personal information is encrypted and stored securely. We never share your information with third parties without your consent. Please review our <Link href="/terms" className="text-brand-accent hover:underline">Terms & Privacy</Link> policy for more details.
								</p>
							</div>
							<div className="border rounded-lg p-4">
								<h3 className="font-semibold text-lg mb-2">Can I shop without creating an account?</h3>
								<p className="text-gray-700">
									Yes, you can browse and add items to your cart without an account. However, you'll need to sign in or create an account to complete your order.
								</p>
							</div>
						</div>
					</section>

					{/* Contact Support */}
					<section>
						<div className="flex items-center gap-3 mb-4">
							<HelpCircle className="h-6 w-6 text-brand-accent" />
							<h2 className="text-2xl font-semibold text-gray-900">Still Need Help?</h2>
						</div>
						<div className="border rounded-lg p-6 bg-gray-50">
							<p className="text-gray-700 mb-4">Our customer support team is here to help you. Get in touch with us:</p>
							<div className="grid sm:grid-cols-3 gap-4">
								<a href="tel:03393399393" className="flex items-center gap-3 p-3 bg-white rounded-md hover:shadow-md transition-shadow">
									<Phone className="h-5 w-5 text-brand-accent" />
									<div>
										<div className="text-sm font-medium">Call Us</div>
										<div className="text-xs text-gray-600">03393399393</div>
									</div>
								</a>
								<a href="mailto:info@chakki.pk" className="flex items-center gap-3 p-3 bg-white rounded-md hover:shadow-md transition-shadow">
									<Mail className="h-5 w-5 text-brand-accent" />
									<div>
										<div className="text-sm font-medium">Email Us</div>
										<div className="text-xs text-gray-600">info@chakki.pk</div>
									</div>
								</a>
								<Link href="/contact" className="flex items-center gap-3 p-3 bg-white rounded-md hover:shadow-md transition-shadow">
									<MessageCircle className="h-5 w-5 text-brand-accent" />
									<div>
										<div className="text-sm font-medium">Contact Page</div>
										<div className="text-xs text-gray-600">Visit our contact page</div>
									</div>
								</Link>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	)
}

