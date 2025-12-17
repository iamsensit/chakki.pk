export default function Stepper({ step }: { step: number }) {
	const steps = ['Details', 'Review', 'Confirmation']
	return (
		<ol className="flex items-center gap-3 text-sm">
			{steps.map((label, idx) => (
				<li key={label} className={`flex items-center gap-2 ${idx <= step ? 'text-emerald-700' : 'text-slate-400'}`}>
					<div className={`h-6 w-6 rounded-full border flex items-center justify-center ${idx <= step ? 'bg-emerald-600 text-white border-emerald-600' : ''}`}>{idx + 1}</div>
					<span>{label}</span>
					{idx < steps.length - 1 && <div className="w-8 h-px bg-slate-200" />}
				</li>
			))}
		</ol>
	)
}
