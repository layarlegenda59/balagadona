import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product } from '../types'

interface CartStore {
  items: CartItem[]
  cartNotes: string
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  increaseQty: (productId: string) => void
  decreaseQty: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  setCartNotes: (notes: string) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => {
      console.log("Inisialisasi Cart Store...");
      return {
        items: [],
        cartNotes: '',
        addItem: (product) => {
          const items = get().items
          const existing = items.find((i) => i.product.id === product.id)

          if (existing) {
            set({
              items: items.map((i) =>
                i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            })
          } else {
            set({ items: [...items, { product, quantity: 1 }] })
          }
        },
        removeItem: (productId) => {
          set({ items: get().items.filter((i) => i.product.id !== productId) })
        },
        increaseQty: (productId) => {
          set({
            items: get().items.map((i) =>
              i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i
            ),
          })
        },
        decreaseQty: (productId) => {
          const items = get().items
          const item = items.find((i) => i.product.id === productId)
          if (item && item.quantity > 1) {
            set({
              items: items.map((i) =>
                i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
              ),
            })
          } else {
            set({ items: items.filter((i) => i.product.id !== productId) })
          }
        },
        setQty: (productId, qty) => {
          set({
            items: get().items.map((i) =>
              i.product.id === productId ? { ...i, quantity: qty } : i
            ),
          })
        },
        setCartNotes: (notes) => set({ cartNotes: notes }),
        clearCart: () => set({ items: [], cartNotes: '' }),
        totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
        totalPrice: () =>
          get().items.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
      }
    },
    {
      name: 'cart-storage',
      skipHydration: false,
    }
  )
)
