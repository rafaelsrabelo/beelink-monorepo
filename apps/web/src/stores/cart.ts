// Libs
import { createStore } from "zustand/vanilla"

// App
import { addLine, cartCookieOf, setLineQty, type CartLine } from "@/lib/cart-cookie"

export interface CartState {
  lines: CartLine[]
  /** The coupon the shopper applied, as the shop stores it; null with none. In memory only — see below. */
  coupon: string | null
  add: (line: CartLine) => void
  setQty: (productId: string, variantId: string | null, qty: number) => void
  remove: (productId: string, variantId: string | null) => void
  /** The order went out: the lines and the coupon it took are gone with it. */
  clear: () => void
  setCoupon: (code: string | null) => void
}

export type CartStore = ReturnType<typeof createCartStore>

/**
 * The cart of one shop, in memory, written through to its cookie on every change (apps/web
 * AGENTS.md, rule 7). It starts from what the server read from that cookie, so the first render in
 * the browser draws what the HTML already drew.
 *
 * One per shop and per page load, not a module singleton: two shops are two carts, and a store
 * shared by every request on the server would hand one visitor's cart to the next.
 *
 * The coupon stays out of the cookie (BEELINK-194): it lives as long as the page does, across the
 * trip to add an address and back. A reload asks for it again — and since the totals on screen are
 * priced without it until it is typed, nothing is ever charged that the shopper did not read.
 */
export function createCartStore(slug: string, initial: readonly CartLine[]) {
  return createStore<CartState>()((set, get) => {
    const commit = (lines: CartLine[]) => {
      set({ lines })
      if (typeof document !== "undefined") document.cookie = cartCookieOf(slug, lines, window.location.protocol === "https:")
    }

    return {
      lines: [...initial],
      coupon: null,
      add: (line) => commit(addLine(get().lines, line)),
      setQty: (productId, variantId, qty) => commit(setLineQty(get().lines, productId, variantId, qty)),
      remove: (productId, variantId) => commit(setLineQty(get().lines, productId, variantId, 0)),
      clear: () => {
        set({ coupon: null })
        commit([])
      },
      setCoupon: (coupon) => set({ coupon }),
    }
  })
}
