"use client"

// React
import { createContext, useContext, useMemo, type ReactNode } from "react"

// App
import type { AffiliateReferral } from "@/lib/affiliate-link"

export interface ShopReferral {
  slug: string
  referral: AffiliateReferral | null
}

const ReferralContext = createContext<ShopReferral | null>(null)

export interface AffiliateReferralProviderProps {
  slug: string
  /** Whom this browser came to the shop by, as the layout read it from `bl_affiliate` on this request; null for nobody. */
  referral: AffiliateReferral | null
  children: ReactNode
}

/**
 * Whose recommendation this visit is (IMPULSEIA-105), for the components that run in the browser:
 * the strip and the card under the header, and the line in the cart and the checkout. The shop's
 * layout provides it once per page load, and again when an arrival asks for the page to be drawn
 * anew. Outside it — the panel's design preview draws the same frame — there is nobody.
 */
export function AffiliateReferralProvider({ slug, referral, children }: AffiliateReferralProviderProps) {
  const value = useMemo(() => ({ slug, referral }), [slug, referral])

  return <ReferralContext value={value}>{children}</ReferralContext>
}

/** The shop's referral, or null outside a shop. */
export function useShopReferral(): ShopReferral | null {
  return useContext(ReferralContext)
}
