import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type WishlistItem = {
	productId: string
	title: string
	image?: string
}

type WishlistState = {
	items: WishlistItem[]
	toggle: (item: WishlistItem) => void
	contains: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistState>()(
	persist(
		(set, get) => ({
			items: [],
			toggle: (item) => {
				const exists = get().items.some(i => i.productId === item.productId)
				if (exists) set({ items: get().items.filter(i => i.productId !== item.productId) })
				else set({ items: [item, ...get().items] })
			},
			contains: (productId) => get().items.some(i => i.productId === productId)
		}),
		{ name: 'chakki-wishlist', storage: createJSONStorage(() => localStorage) }
	)
)
