"use client"

// UI
import { AffiliateFilterChip } from "@harness-monorepo/ui/blocks/affiliates/affiliate-filter-chip"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { useShopAffiliate } from "@/services/affiliates/shop-affiliate-hooks"

export interface OrdersAffiliateFilterProps {
  slug: string
  affiliateId: string
  /** The list as it is, less the affiliate. */
  clearHref: string
  messages: UiMessages
}

/** Whose orders the list is kept to (IMPULSEIA-107), named, with the way back to every order. */
export function OrdersAffiliateFilter({ slug, affiliateId, clearHref, messages }: OrdersAffiliateFilterProps) {
  const affiliate = useShopAffiliate(slug, affiliateId)

  if (affiliate.isPending) return <Skeleton className="h-8 w-48 rounded-full" />
  // An id that names nobody of this shop still filters — to nothing — and says so by the empty list.
  return <AffiliateFilterChip name={affiliate.data?.name ?? "—"} clearHref={clearHref} linkComponent={AppLink} messages={messages} />
}
