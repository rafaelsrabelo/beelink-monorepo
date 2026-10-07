// Libs
import { create } from "zustand"

export interface OfferStripState {
  /** The shops whose strip was closed in this page's life, by slug. */
  closed: Readonly<Record<string, true>>
  close: (slug: string) => void
}

/**
 * Whether a shop's offer strip was closed — in memory, and nowhere else. It holds across the pages
 * a visitor follows inside the shop and is gone at the next full load, when the strip is back.
 *
 * Not remembered on purpose. A cookie would be one more the published privacy policy has to list,
 * which is a new version of a legal text; web storage is forbidden outright (`web/no-web-storage`).
 * A module store and not one per shop, like the conversations' panel: it holds nothing of a
 * visitor, and nothing sets it on the server, where every request reads it open.
 */
export const useOfferStrip = create<OfferStripState>()((set) => ({
  closed: {},
  close: (slug) => set((state) => ({ closed: { ...state.closed, [slug]: true } })),
}))
