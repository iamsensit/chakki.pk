export default function PriceTierTable({ tiers }: { tiers: { minQty: number; maxQty: number | null; pricePerKg: number }[] }) {
	if (!tiers?.length) return null
	return (
		<div className="mt-4">
			<div className="text-sm font-medium">Bulk pricing</div>
			<div className="mt-2 overflow-hidden rounded-md border">
				<table className="w-full text-sm">
					<thead className="bg-gray-50 text-left text-slate-600">
						<tr>
							<th className="px-3 py-2">Qty (bags)</th>
							<th className="px-3 py-2">Price / kg</th>
						</tr>
					</thead>
					<tbody>
						{tiers.map((t, idx) => (
							<tr key={idx} className="border-t">
								<td className="px-3 py-2">{t.minQty}–{t.maxQty ?? '∞'}</td>
								<td className="px-3 py-2">Rs. {t.pricePerKg}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
