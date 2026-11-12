// Libs
import { create } from "zustand"

export interface AffiliateReferralState {
  /** The shops whose referral strip was closed in this page's life, by slug. */
  closed: Readonly<Record<string, true>>
  close: (slug: string) => void
}

/**
 * Whether a shop's referral strip was closed on this page (IMPULSEIA-105) — in memory: it takes the
 * strip off the page at the click, and across the pages a visitor follows inside the shop without a
 * full load. Whom the referral names is the server's, read from `bl_affiliate` by the shop's layout;
 * what outlives the page is the browser's `bl_affiliate_hidden`, written at the same click. A module
 * store, like the offer strip's: it holds nothing of a visitor, and nothing sets it on the server.
 */
export const useAffiliateReferralUi = create<AffiliateReferralState>()((set) => ({
  closed: {},
  close: (slug) => set((state) => ({ closed: { ...state.closed, [slug]: true } })),
}))
