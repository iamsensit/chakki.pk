import Link from 'next/link'

export default function TermsPrivacyPage() {
	return (
		<div className="container-pg py-8">
			<h1 className="text-2xl font-semibold">Terms & Privacy</h1>

			<div className="mt-6 space-y-6 text-slate-700">
				<p>
					Welcome to Chakki.pk. By accessing or using our website and services, you agree to be bound by these
					Terms of Service and our Privacy Policy. Please read them carefully.
				</p>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">1. Terms of Service</h2>
					<h3 className="font-semibold text-lg mt-3 mb-1">1.1 Acceptance of Terms</h3>
					<p>
						These Terms of Service ("Terms") govern your access to and use of the Chakki.pk website and services.
						By using our services, you agree to these Terms.
					</p>

					<h3 className="font-semibold text-lg mt-3 mb-1">1.2 Changes to Terms</h3>
					<p>
						We reserve the right to modify or replace these Terms at any time. We will notify you of any changes
						by posting the new Terms on this page. Your continued use of the service after any such changes
						constitutes your acceptance of the new Terms.
					</p>

					<h3 className="font-semibold text-lg mt-3 mb-1">1.3 User Accounts</h3>
					<p>
						You may need to create an account to access certain features. You are responsible for maintaining
						the confidentiality of your account information and for all activities that occur under your account.
					</p>

					<h3 className="font-semibold text-lg mt-3 mb-1">1.4 Product Information and Pricing</h3>
					<p>
						We strive to ensure that all product descriptions and pricing are accurate. However, errors may occur.
						We reserve the right to correct any errors, inaccuracies, or omissions and to change or update
						information or cancel orders if any information is inaccurate at any time without prior notice.
					</p>

					<h3 className="font-semibold text-lg mt-3 mb-1">1.5 Order Acceptance and Cancellation</h3>
					<p>
						Your receipt of an electronic or other form of order confirmation does not signify our final acceptance
						of your order. We reserve the right at any time after receipt of your order to accept or decline your
						order for any reason.
					</p>
				</section>

				<section>
					<h2 className="font-medium text-xl mb-2 text-slate-800">2. Privacy Policy</h2>
					<h3 className="font-semibold text-lg mt-3 mb-1">2.1 Information We Collect</h3>
					<p>
						We collect personal information that you voluntarily provide to us when you register on the website,
						place an order, or contact us. This may include your name, email address, phone number, shipping address,
						and payment information.
					</p>

					<h3 className="font-semibold text-lg mt-3 mb-1">2.2 How We Use Your Information</h3>
					<p>
						We use the information we collect to:
					</p>
					<ul className="list-disc list-inside space-y-1 mt-2">
						<li>Process your orders and manage your account.</li>
						<li>Communicate with you about your orders, products, services, and promotional offers.</li>
						<li>Improve our website and services.</li>
						<li>Prevent fraudulent transactions.</li>
					</ul>

					<h3 className="font-semibold text-lg mt-3 mb-1">2.3 Data Security</h3>
					<p>
						We implement a variety of security measures to maintain the safety of your personal information
						when you place an order or enter, submit, or access your personal information.
					</p>

					<h3 className="font-semibold text-lg mt-3 mb-1">2.4 Third-Party Disclosure</h3>
					<p>
						We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties
						without your consent, except to trusted third parties who assist us in operating our website, conducting
						our business, or servicing you, so long as those parties agree to keep this information confidential.
					</p>

					<h3 className="font-semibold text-lg mt-3 mb-1">2.5 Your Consent</h3>
					<p>
						By using our site, you consent to our website's terms of service and privacy policy.
					</p>
				</section>

				<p className="mt-6 text-sm text-slate-600">
					If you have any questions regarding these Terms & Privacy, please <Link href="/contact" className="text-brand-accent hover:underline">contact us</Link>.
				</p>
			</div>
		</div>
	)
}

