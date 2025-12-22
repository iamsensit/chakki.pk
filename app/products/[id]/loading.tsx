export default function Loading() {
	return (
		<div className="container-pg py-8">
			<div className="grid gap-8 lg:grid-cols-2">
				<div>
					<div className="aspect-square rounded-xl bg-gray-100 animate-pulse mb-4" />
					<div className="flex gap-2 justify-center">
						{[1, 2, 3].map(i => (
							<div key={i} className="h-20 w-20 rounded-md bg-gray-100 animate-pulse" />
						))}
					</div>
				</div>
				<div className="space-y-4">
					<div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
					<div className="h-6 bg-gray-100 rounded animate-pulse w-1/2" />
					<div className="h-10 bg-gray-100 rounded animate-pulse w-1/3" />
					<div className="h-24 bg-gray-100 rounded animate-pulse" />
					<div className="h-12 bg-gray-100 rounded animate-pulse w-full" />
				</div>
			</div>
		</div>
	)
}

