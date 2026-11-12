"use client"

// UI
import { StorefrontAffiliateNote } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-note"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useShopReferral } from "./affiliate-referral-provider"

export interface StorefrontAffiliateNoteLiveProps {
  messages: UiMessages
}

/**
 * The cart's and the checkout's line about whom this order is a recommendation of (IMPULSEIA-105):
 * always there while the referral stands, closed strip or not — the buyer is told, where they
 * decide, that the affiliate will read their name on the order.
 */
export function StorefrontAffiliateNoteLive({ messages }: StorefrontAffiliateNoteLiveProps) {
  const affiliate = useShopReferral()?.referral?.affiliate
  if (!affiliate) return null

  return <StorefrontAffiliateNote name={affiliate.name} photoUrl={affiliate.photoUrl} messages={messages} />
}
