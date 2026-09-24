"use client"

// React
import { createContext, useContext, useState, type ReactNode } from "react"

// Libs
import { useStore } from "zustand"

// App
import type { CartLine } from "@/lib/cart-cookie"
import { createCartStore, type CartState, type CartStore } from "@/stores/cart"

const CartContext = createContext<CartStore | null>(null)

/**
 * Outside a shop — the panel's design preview draws the same header — there is no cart to read.
 * An empty one that ignores every change stands in, rather than a header that throws.
 */
const INERT: CartStore = createCartStore("", [])
INERT.setState({ add: () => {}, setQty: () => {}, remove: () => {}, clear: () => {} })

export interface CartProviderProps {
  slug: string
  /** What the server read from the cookie, so the browser starts where the HTML left off. */
  lines: readonly CartLine[]
  children: ReactNode
}

/** The shop's cart, for every page of it. The layout provides it once per shop and page load. */
export function CartProvider({ slug, lines, children }: CartProviderProps) {
  const [store] = useState(() => createCartStore(slug, lines))

  return <CartContext value={store}>{children}</CartContext>
}

/** One field of the cart per subscription (docs/ai-rules/state-and-data.md): `useCart((cart) => cart.add)`. */
export function useCart<T>(selector: (state: CartState) => T): T {
  return useStore(useContext(CartContext) ?? INERT, selector)
}
