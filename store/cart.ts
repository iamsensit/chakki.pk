import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type CartItem = {
	id: string // local id
	productId: string
	variantId?: string
	title: string
	variantLabel?: string
	image?: string
	quantity: number
	unitPrice: number
}

type CartState = {
	items: CartItem[]
	add: (item: Omit<CartItem, 'id'>) => void
	remove: (id: string) => void
	updateQty: (id: string, quantity: number) => void
	increment: (id: string, amount?: number) => void
	decrement: (id: string, amount?: number) => void
	setAll: (items: Omit<CartItem, 'id'>[]) => void
	clear: () => void
}

// Generate unique ID with fallback for environments where crypto.randomUUID() is not available
function generateId(): string {
	if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
		return window.crypto.randomUUID()
	}
	// Fallback for older browsers or server environments
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Safe localStorage access
function getLocalStorage() {
	if (typeof window === 'undefined') {
		// Return a no-op storage for SSR
		return {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {}
		}
	}
	return localStorage
}

export const useCartStore = create<CartState>()(
	persist(
		(set, get) => ({
			items: [],
			add: (item) => {
				try {
					const items = get().items.slice()
					const idx = items.findIndex(i => i.productId === item.productId && i.variantId === item.variantId)
					if (idx >= 0) {
						items[idx] = { ...items[idx], quantity: items[idx].quantity + item.quantity }
						set({ items })
					} else {
						set({ items: [{ ...item, id: generateId() }, ...items] })
					}
				} catch (error) {
					console.error('Error adding to cart:', error)
				}
			},
			remove: (id) => {
				try {
					set({ items: get().items.filter(i => i.id !== id) })
				} catch (error) {
					console.error('Error removing from cart:', error)
				}
			},
			updateQty: (id, quantity) => {
				try {
					set({ items: get().items.map(i => i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i).filter(i => i.quantity > 0) })
				} catch (error) {
					console.error('Error updating cart quantity:', error)
				}
			},
			increment: (id, amount = 1) => {
				try {
					const items = get().items.map(i => i.id === id ? { ...i, quantity: i.quantity + amount } : i)
					set({ items })
				} catch (error) {
					console.error('Error incrementing cart:', error)
				}
			},
			decrement: (id, amount = 1) => {
				try {
					const items = get().items.map(i => i.id === id ? { ...i, quantity: i.quantity - amount } : i).filter(i => i.quantity > 0)
					set({ items })
				} catch (error) {
					console.error('Error decrementing cart:', error)
				}
			},
			setAll: (items) => {
				try {
					const mapped = items.map(i => ({ ...i, id: generateId() }))
					set({ items: mapped })
				} catch (error) {
					console.error('Error setting cart items:', error)
				}
			},
			clear: () => {
				try {
					set({ items: [] })
				} catch (error) {
					console.error('Error clearing cart:', error)
				}
			}
		}),
		{ 
			name: 'chakki-cart', 
			storage: createJSONStorage(() => getLocalStorage()),
			skipHydration: false
		}
	)
)

export function cartTotal(items: CartItem[]) {
	return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
}
