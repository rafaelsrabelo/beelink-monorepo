// Libs
import { create } from "zustand"

export interface AffiliateReferralState {
  /** The page an affiliate's link arrived at in this page's life, by shop: the card is drawn there, the strip on every other. */
  arrivedOn: Readonly<Record<string, string>>
  /** The shops whose strip was closed in this page's life, by slug. */
  closed: Readonly<Record<string, true>>
  /** A link credited someone on `path`: the card there, and the strip open again. */
  arrive: (slug: string, path: string) => void
  close: (slug: string) => void
}

/**
 * What the visitor did with the shop's referral on this page (IMPULSEIA-105) — in memory: where a
 * link arrived, and whether the strip was closed. Whom the referral names is the server's, read
 * from the `bl_affiliate` cookie by the shop's layout; what outlives the page of a closed strip is
 * the browser's `bl_affiliate_hidden`. A module store, like the offer strip's: it holds nothing of
 * a visitor, and nothing sets it on the server.
 */
export const useAffiliateReferralUi = create<AffiliateReferralState>()((set) => ({
  arrivedOn: {},
  closed: {},
  arrive: (slug, path) =>
    set((state) => ({
      arrivedOn: { ...state.arrivedOn, [slug]: path },
      closed: Object.fromEntries(Object.entries(state.closed).filter(([closedSlug]) => closedSlug !== slug)),
    })),
  close: (slug) => set((state) => ({ closed: { ...state.closed, [slug]: true } })),
}))
