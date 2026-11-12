"use client"

// Next
import { useSearchParams } from "next/navigation"

// UI
import { StorefrontAffiliateBanner } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-banner"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useShopReferral } from "./affiliate-referral-provider"
import { useShopAddress } from "@/components/storefront/shop-address-provider"
import { AFFILIATE_KEY, hiddenCookieOf } from "@/lib/affiliate-cookie"
import { useAffiliateReferralUi } from "@/stores/affiliate-referral"

export interface StorefrontAffiliateBandProps {
  /** The affiliate the page's own address names: an affiliate's link drawn in place. Null where `?afiliado=` says it. */
  arrivedBy?: string | null
  messages: UiMessages
}

/**
 * Whom the visitor came by, under the shop's header (IMPULSEIA-105), in the band the shopkeeper drew:
 * on the address their affiliate's link arrived with — `/<shop>/<name>`, or `?afiliado=<name>` on
 * any page, naming the affiliate the shop credits — with the affiliate's phrase and no way to close
 * it; on every other page without the phrase, until they close it, which hides the band and keeps
 * the referral. Nothing outside a shop's layout, and nothing for a visitor who came by nobody.
 */
export function StorefrontAffiliateBand({ arrivedBy = null, messages }: StorefrontAffiliateBandProps) {
  const shopReferral = useShopReferral()
  const slug = shopReferral?.slug ?? ""
  const named = useSearchParams().get(AFFILIATE_KEY)
  const asked = arrivedBy ?? named
  const shop = useShopAddress(slug)
  const closed = useAffiliateReferralUi((state) => state.closed[slug] === true)
  const close = useAffiliateReferralUi((state) => state.close)

  const referral = shopReferral?.referral
  if (!referral) return null
  const { affiliate } = referral

  if (asked?.toLowerCase() === affiliate.slug) return <StorefrontAffiliateBanner name={affiliate.name} photoUrl={affiliate.photoUrl} tagline={affiliate.tagline} messages={messages} />
  if (referral.hidden || closed) return null

  return (
    <StorefrontAffiliateBanner
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
