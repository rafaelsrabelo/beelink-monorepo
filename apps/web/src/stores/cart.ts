// Libs
import { createStore } from "zustand/vanilla"

// App
import { addLine, cartCookieOf, setLineQty, type CartLine } from "@/lib/cart-cookie"

export interface CartState {
  lines: CartLine[]
  add: (line: CartLine) => void
  setQty: (productId: string, variantId: string | null, qty: number) => void
  remove: (productId: string, variantId: string | null) => void
  clear: () => void
}

export type CartStore = ReturnType<typeof createCartStore>

/**
 * The cart of one shop, in memory, written through to its cookie on every change (apps/web
 * AGENTS.md, rule 7). It starts from what the server read from that cookie, so the first render in
 * the browser draws what the HTML already drew.
 *
 * One per shop and per page load, not a module singleton: two shops are two carts, and a store
 * shared by every request on the server would hand one visitor's cart to the next.
 */
export function createCartStore(slug: string, initial: readonly CartLine[]) {
  return createStore<CartState>()((set, get) => {
    const commit = (lines: CartLine[]) => {
      set({ lines })
      if (typeof document !== "undefined") document.cookie = cartCookieOf(slug, lines, window.location.protocol === "https:")
    }

    return {
      lines: [...initial],
      add: (line) => commit(addLine(get().lines, line)),
      setQty: (productId, variantId, qty) => commit(setLineQty(get().lines, productId, variantId, qty)),
      remove: (productId, variantId) => commit(setLineQty(get().lines, productId, variantId, 0)),
      clear: () => commit([]),
    }
  })
}
