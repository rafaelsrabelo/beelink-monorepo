"use client"

// UI
import { AffiliateShowcaseCard } from "@harness-monorepo/ui/blocks/affiliates/affiliate-showcase-card"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { ShopAffiliate } from "@harness-monorepo/contracts"

// App
import { affiliateErrorOf } from "@/lib/affiliate-form"
import { useClearAffiliateShowcase } from "@/services/affiliates/affiliate-money-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"

export interface AffiliateShowcaseSectionProps {
  slug: string
  affiliate: Pick<ShopAffiliate, "id" | "name" | "photoUrl" | "tagline">
  messages: UiMessages
}

/** What the shop window shows of the affiliate, which the shop may take off (IMPULSEIA-107, addendum D). */
export function AffiliateShowcaseSection({ slug, affiliate, messages }: AffiliateShowcaseSectionProps) {
  const clear = useClearAffiliateShowcase(slug, affiliate.id)

  return (
    <AffiliateShowcaseCard
      showcase={{ name: affiliate.name, photoUrl: affiliate.photoUrl, tagline: affiliate.tagline }}
      onRemovePhoto={() => clear.mutate("photo")}
      onRemoveTagline={() => clear.mutate("tagline")}
      busy={clear.isPending ? (clear.variables ?? null) : null}
      error={clear.error ? affiliateErrorOf(clear.error instanceof AffiliateError ? clear.error.errorCode : "UNKNOWN", messages.affiliates.errors) : undefined}
      messages={messages}
    />
  )
}
