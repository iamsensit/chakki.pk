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
	isDrawerOpen: boolean
	lastAddedItem: CartItem | null
	add: (item: Omit<CartItem, 'id'>, openDrawerAfter?: boolean) => void
	remove: (id: string) => void
	updateQty: (id: string, quantity: number) => void
	increment: (id: string, amount?: number) => void
	decrement: (id: string, amount?: number) => void
	setAll: (items: Omit<CartItem, 'id'>[]) => void
	clear: () => void
	openDrawer: () => void
	closeDrawer: () => void
	toggleDrawer: () => void
}

function generateId(): string {
	if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
		return window.crypto.randomUUID()
	}
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function getLocalStorage() {
	if (typeof window === 'undefined') {
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
			isDrawerOpen: false,
			lastAddedItem: null,
			add: (item, openDrawerAfter = false) => {
				try {
					const items = get().items.slice()
					const idx = items.findIndex(i => i.productId === item.productId && i.variantId === item.variantId)
					let createdItem: CartItem
					if (idx >= 0) {
						items[idx] = { ...items[idx], quantity: items[idx].quantity + item.quantity }
						createdItem = items[idx]
						set({ items, lastAddedItem: createdItem, isDrawerOpen: openDrawerAfter ? true : get().isDrawerOpen })
					} else {
						createdItem = { ...item, id: generateId() }
						set({ items: [createdItem, ...items], lastAddedItem: createdItem, isDrawerOpen: openDrawerAfter ? true : get().isDrawerOpen })
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
			clear: () => set({ items: [] }),
			openDrawer: () => set({ isDrawerOpen: true }),
			closeDrawer: () => set({ isDrawerOpen: false }),
			toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
		}),
		{
			name: 'cart_storage',
			storage: createJSONStorage(() => getLocalStorage()),
			partialize: (state) => ({ items: state.items }),
		}
	)
)

export function cartTotal(items: CartItem[]) {
	if (!Array.isArray(items)) return 0
	return items.reduce((acc, i) => acc + (i.unitPrice || 0) * (i.quantity || 0), 0)
}
