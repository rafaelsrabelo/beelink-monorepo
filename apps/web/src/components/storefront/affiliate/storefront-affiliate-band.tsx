"use client"

// Next
import { useSearchParams } from "next/navigation"

// UI
import { StorefrontAffiliateBanner } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-banner"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useShopReferral } from "./affiliate-referral-provider"
import { AFFILIATE_KEY } from "@/lib/affiliate-cookie"

export interface StorefrontAffiliateBandProps {
  /** The affiliate the page's own address names: an affiliate's link drawn in place. Null where `?afiliado=` says it. */
  arrivedBy?: string | null
  messages: UiMessages
}

/**
 * Whom the visitor came by, under the shop's header (IMPULSEIA-105), in the band the shopkeeper drew
 * — only where the link is in the address: `/<shop>/<name>` drawn in place, or `?afiliado=<name>` on
 * any page, naming the affiliate the shop credits. A visit straight to the shop shows none, even
 * while the referral holds: the order is still credited, and the cart and the checkout say so.
 */
export function StorefrontAffiliateBand({ arrivedBy = null, messages }: StorefrontAffiliateBandProps) {
  const referral = useShopReferral()?.referral
  const named = useSearchParams().get(AFFILIATE_KEY)
  const asked = (arrivedBy ?? named)?.toLowerCase()

  if (!referral || !asked || asked !== referral.affiliate.slug) return null
  const { affiliate } = referral
  return <StorefrontAffiliateBanner name={affiliate.name} photoUrl={affiliate.photoUrl} tagline={affiliate.tagline} messages={messages} />
}
