import React from 'react'

export default function Loading() {
	return (
		<div className="container-pg py-8">
			<div className="mx-auto w-full max-w-6xl">
				<div className="skeleton h-8 w-48 mb-6" />
				<div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
					<aside className="lg:col-span-3">
						<div className="skeleton h-64 rounded-md" />
					</aside>
					<section className="lg:col-span-9">
						<div className="skeleton h-96 rounded-md" />
					</section>
				</div>
			</div>
		</div>
	)
}

