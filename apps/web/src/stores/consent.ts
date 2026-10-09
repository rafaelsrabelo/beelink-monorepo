// Libs
import { createStore } from "zustand/vanilla"

// App
import { consentCookieOf, type ConsentChoice } from "@/lib/consent-cookie"
import type { ShopAddress } from "@/lib/shop-address"

export interface ConsentState {
  /** What the visitor answered at this shop; null while they have not. */
  choice: ConsentChoice | null
  /** Whether the strip is on the page: nobody answered yet, or the visitor asked to choose again. */
  asking: boolean
  /** True once an answer was given on this page, so it can be said aloud; a choice read from the cookie is not news. */
  answered: boolean
  /** How many times the visitor asked for the choice on this page: each one sends the focus to the strip. */
  asks: number
  accept: () => void
  refuse: () => void
  /** The way back to the choice, from the footer. */
  ask: () => void
}

export type ConsentStore = ReturnType<typeof createConsentStore>

/**
 * One shop's answer to "may this shop track you for its ads?", in memory, written through to its
 * cookie at the click (BEELINK-271). It starts from what the server read from that cookie, so the
 * first render in the browser draws what the HTML already drew.
 *
 * One per shop and per page load, like the cart: a store shared by every request on the server
 * would hand one visitor's answer to the next.
 */
export function createConsentStore(shop: ShopAddress, initial: ConsentChoice | null) {
  return createStore<ConsentState>()((set) => {
    const commit = (choice: ConsentChoice) => {
      set({ choice, asking: false, answered: true })
      if (typeof document !== "undefined") document.cookie = consentCookieOf(shop, choice, window.location.protocol === "https:")
    }

    return {
      choice: initial,
      asking: initial === null,
      answered: false,
      asks: 0,
      accept: () => commit("granted"),
      refuse: () => commit("denied"),
      ask: () => set((state) => ({ asking: true, answered: false, asks: state.asks + 1 })),
    }
  })
}
