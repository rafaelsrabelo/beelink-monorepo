// Libs
import { create } from "zustand"

export interface OfferStripState {
  /** The shops whose strip was closed in this page's life, by slug. */
  closed: Readonly<Record<string, true>>
  close: (slug: string) => void
}

/**
 * Whether a shop's offer strip was closed on this page — in memory. It takes the strip off the page
 * at the click, and across the pages a visitor follows inside the shop without a full load.
 *
 * What outlives the page is the browser's `bl_popup` cookie (BEELINK-311), written at the same
 * click by `StorefrontOfferStripLive`: the server reads it and leaves the strip out of the next
 * page. Web storage is forbidden outright (`web/no-web-storage`). A module store and not one per
 * shop, like the conversations' panel: it holds nothing of a visitor, and nothing sets it on the
 * server, where every request reads it open.
 */
export const useOfferStrip = create<OfferStripState>()((set) => ({
  closed: {},
  close: (slug) => set((state) => ({ closed: { ...state.closed, [slug]: true } })),
}))
