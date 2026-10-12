// Libs
import { createStore } from "zustand/vanilla"

// App
import { siteConsentCookieOf, type SiteConsentChoice } from "@/lib/site-consent-cookie"

export interface SiteConsentState {
  /** What the visitor answered Beelink's site; null while they have not. */
  choice: SiteConsentChoice | null
  /** Whether the notice is on the page: nobody answered yet, or the visitor asked to choose again. */
  asking: boolean
  /** True once an answer was given on this page, so it can be said aloud; a choice read from the cookie is not news. */
  answered: boolean
  /** How many times the visitor asked for the choice on this page: each one sends the focus to the notice. */
  asks: number
  accept: () => void
  refuse: () => void
  /** The way back to the choice, from the footer. */
  ask: () => void
}

export type SiteConsentStore = ReturnType<typeof createSiteConsentStore>

/**
 * The answer to "may Beelink measure your visit to its own site?", in memory, written through to
 * `bl_site_consent` at the click (BEELINK-319). It starts from what the server read from that
 * cookie, so the first render in the browser draws what the HTML already drew.
 *
 * One per page load: a store shared by every request on the server would hand one visitor's answer
 * to the next. A store of its own, apart from a shop's (`stores/consent.ts`), whose answer is to
 * another question and is written to another cookie.
 */
export function createSiteConsentStore(initial: SiteConsentChoice | null) {
  return createStore<SiteConsentState>()((set) => {
    const commit = (choice: SiteConsentChoice) => {
      set({ choice, asking: false, answered: true })
      if (typeof document !== "undefined") document.cookie = siteConsentCookieOf(choice, window.location.protocol === "https:")
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
