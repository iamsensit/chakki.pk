"use client"

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import CartDrawer from './CartDrawer'

type MiniCartProps = {
	variant?: 'default' | 'compact'
	iconColor?: string
	badgeColor?: string
}

export default function MiniCart({ variant = 'default', iconColor = 'currentColor', badgeColor = 'bg-red-500' }: MiniCartProps = {}) {
	const { items } = useCartStore()
	const [drawerOpen, setDrawerOpen] = useState(false)
	const isCompact = variant === 'compact'

	return (
		<>
			<button 
				aria-label="Cart" 
				className="relative hover:opacity-80 transition-opacity" 
				onClick={() => setDrawerOpen(true)}
			>
				<div className="relative">
					<ShoppingCart className={isCompact ? 'h-5 w-5' : 'h-6 w-6'} strokeWidth={1.5} style={{ color: iconColor }} />
					{items.length > 0 && (
						<span className={`absolute -top-2 -right-2 ${isCompact ? 'h-4 w-4 text-[10px]' : 'h-5 w-5 text-xs'} rounded-full ${badgeColor} text-white flex items-center justify-center font-bold`}>
							{items.length}
						</span>
					)}
				</div>
			</button>
			<CartDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
		</>
	)
}
