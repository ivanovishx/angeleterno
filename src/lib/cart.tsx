import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Customization, Product } from '../../shared/types'

export interface CartItem {
  key: string
  product: Product
  quantity: number
  customization: Customization
}

interface CartState {
  items: CartItem[]
  count: number
  total: number
  add: (product: Product, customization: Customization) => void
  update: (key: string, patch: Partial<Pick<CartItem, 'quantity' | 'customization'>>) => void
  remove: (key: string) => void
  clear: () => void
}

const CART_KEY = 'ae_cart'
const CartContext = createContext<CartState | null>(null)

function load(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load)

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items))
    } catch {
      // almacenamiento no disponible
    }
  }, [items])

  const value: CartState = {
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    total: items.reduce((s, i) => s + i.product.price * i.quantity, 0),
    add: (product, customization) =>
      setItems((prev) => [...prev, { key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, product, quantity: 1, customization }]),
    update: (key, patch) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i))),
    remove: (key) => setItems((prev) => prev.filter((i) => i.key !== key)),
    clear: () => setItems([]),
  }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
