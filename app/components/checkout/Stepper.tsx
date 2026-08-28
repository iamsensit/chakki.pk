"use client"

import { Check } from 'lucide-react'

export default function Stepper({ step }: { step: number }) {
	const steps = [
		{ label: 'Customer Details', sub: 'Address & Contact' },
		{ label: 'Payment & Speed', sub: 'COD or Online' },
		{ label: 'Order Complete', sub: 'Confirmation' }
	]

	return (
		<nav aria-label="Checkout Progress" className="w-full">
			<ol className="flex items-center justify-between w-full max-w-2xl mx-auto">
				{steps.map((s, idx) => {
					const isCompleted = idx < step
					const isCurrent = idx === step
					
					return (
						<li key={s.label} className="flex-1 flex items-center relative">
							<div className="flex items-center gap-3">
								<div
									className={`h-9 w-9 rounded-full flex items-center justify-center font-extrabold text-xs transition-all shadow-xs ${
										isCompleted
											? 'bg-[#7EB338] text-white'
											: isCurrent
											? 'bg-[#7EB338] text-white ring-4 ring-[#7EB338]/20'
											: 'bg-slate-100 text-[#718096] border border-[#E2E8F0]'
									}`}
								>
									{isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : idx + 1}
								</div>
								<div className="hidden sm:flex flex-col text-left">
									<span className={`text-xs font-bold ${isCurrent || isCompleted ? 'text-[#2D3748]' : 'text-[#718096]'}`}>
										{s.label}
									</span>
									<span className="text-[10px] text-[#718096]">{s.sub}</span>
								</div>
							</div>

							{idx < steps.length - 1 && (
								<div className="flex-1 h-0.5 mx-3 sm:mx-6 bg-[#E2E8F0] relative overflow-hidden rounded-full">
									<div
										className={`h-full transition-all duration-300 ${
											isCompleted ? 'bg-[#7EB338]' : 'bg-transparent'
										}`}
										style={{ width: isCompleted ? '100%' : '0%' }}
									/>
								</div>
							)}
						</li>
					)
				})}
			</ol>
		</nav>
	)
}
