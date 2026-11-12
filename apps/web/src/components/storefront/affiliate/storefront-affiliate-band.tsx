"use client"

// UI
import { StorefrontAffiliateBanner } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-banner"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useShopReferral } from "./affiliate-referral-provider"

export interface StorefrontAffiliateBandProps {
  messages: UiMessages
}

/**
 * Whom the visitor came by, under the shop's header (IMPULSEIA-105), in the band the shopkeeper drew
 * — on every page while the visit is attributed: the visit that came by the link, until the browser
 * closes (`bl_affiliate` is the session's). A visit that did not come by a link has no referral, and
 * no band; nothing to close, since the band and the credit end together.
 */
export function StorefrontAffiliateBand({ messages }: StorefrontAffiliateBandProps) {
  const referral = useShopReferral()?.referral
  if (!referral) return null

  const { affiliate } = referral
  return <StorefrontAffiliateBanner name={affiliate.name} photoUrl={affiliate.photoUrl} tagline={affiliate.tagline} messages={messages} />
}
