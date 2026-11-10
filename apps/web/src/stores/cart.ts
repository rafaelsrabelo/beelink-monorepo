// Libs
import { createStore } from "zustand/vanilla"

// App
import { addLine, cartCookieOf, setLineQty, type CartKitPart, type CartLine } from "@/lib/cart-cookie"
import type { ShopAddress } from "@/lib/shop-address"

export interface CartState {
  lines: CartLine[]
  add: (line: CartLine) => void
  /** A kit's line is named with what is in it: another kit of the same product is another line. */
  setQty: (productId: string, variantId: string | null, qty: number, kit?: readonly CartKitPart[]) => void
  remove: (productId: string, variantId: string | null, kit?: readonly CartKitPart[]) => void
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
export function createCartStore(shop: ShopAddress, initial: readonly CartLine[]) {
  return createStore<CartState>()((set, get) => {
    const commit = (lines: CartLine[]) => {
      set({ lines })
      if (typeof document !== "undefined") document.cookie = cartCookieOf(shop, lines, window.location.protocol === "https:")
    }

    return {
      lines: [...initial],
      add: (line) => commit(addLine(get().lines, line)),
      setQty: (productId, variantId, qty, kit) => commit(setLineQty(get().lines, productId, variantId, qty, kit)),
      remove: (productId, variantId, kit) => commit(setLineQty(get().lines, productId, variantId, 0, kit)),
      clear: () => commit([]),
    }
  })
}
