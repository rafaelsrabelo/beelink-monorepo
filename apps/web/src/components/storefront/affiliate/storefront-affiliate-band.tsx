"use client"

// Next
import { usePathname } from "next/navigation"

// UI
import { StorefrontAffiliateCard } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-card"
import { StorefrontAffiliateStrip } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-strip"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useShopReferral } from "./affiliate-referral-provider"
import { useShopAddress } from "@/components/storefront/shop-address-provider"
import { hiddenCookieOf } from "@/lib/affiliate-cookie"
import { useAffiliateReferralUi } from "@/stores/affiliate-referral"

export interface StorefrontAffiliateBandProps {
  messages: UiMessages
}

/**
 * Whom the visitor came by, under the shop's header (IMPULSEIA-105): the card on the page their link
 * arrived at, the slim strip on every other — until they close it, which hides the strip and keeps
 * the referral. Nothing outside a shop's layout, and nothing for a visitor who came by nobody.
 */
export function StorefrontAffiliateBand({ messages }: StorefrontAffiliateBandProps) {
  const shopReferral = useShopReferral()
  const slug = shopReferral?.slug ?? ""
  const pathname = usePathname()
  const shop = useShopAddress(slug)
  const arrivedOn = useAffiliateReferralUi((state) => state.arrivedOn[slug])
  const closed = useAffiliateReferralUi((state) => state.closed[slug] === true)
  const close = useAffiliateReferralUi((state) => state.close)

  const referral = shopReferral?.referral
  if (!referral) return null
  const { affiliate } = referral

  if (arrivedOn === pathname) return <StorefrontAffiliateCard name={affiliate.name} photoUrl={affiliate.photoUrl} tagline={affiliate.tagline} messages={messages} />
  if (referral.hidden || closed) return null

  return (
    <StorefrontAffiliateStrip
      name={affiliate.name}
      photoUrl={affiliate.photoUrl}
      onDismiss={() => {
        document.cookie = hiddenCookieOf(shop, affiliate.id, window.location.protocol === "https:")
        close(slug)
      }}
      messages={messages}
    />
  )
}
