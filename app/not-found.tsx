import Link from 'next/link'

export default function NotFound() {
	return (
		<div className="container-pg py-16 text-center">
			<h2 className="text-2xl font-semibold mb-4">Not Found</h2>
			<p className="text-gray-600 mb-6">Could not find the requested resource</p>
			<Link
				href="/"
				className="inline-block px-6 py-2 bg-brand-accent text-white rounded-md hover:bg-orange-600 transition-colors"
			>
				Return Home
			</Link>
		</div>
	)
}

