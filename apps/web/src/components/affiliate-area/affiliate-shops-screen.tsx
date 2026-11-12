"use client"

// UI
import { AffiliateAreaNotice } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-area-notice"
import { AffiliateShopCards } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-shop-cards"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { shopCardOf } from "@/lib/affiliate-area-view"
import { useMyAffiliateShops } from "@/services/affiliate-area/affiliate-area-hooks"

export interface AffiliateShopsScreenProps {
  locale: string
  messages: UiMessages
}

/** `/afiliado` (IMPULSEIA-108): the shops the account sells for — always the list, even with one, since the e-mails lead here. */
export function AffiliateShopsScreen({ locale, messages }: AffiliateShopsScreenProps) {
  const shops = useMyAffiliateShops()

  if (shops.isPending) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    )
  }
  if (shops.isError) return <AffiliateAreaNotice kind="failed" onRetry={() => void shops.refetch()} messages={messages} />

  const money = (cents: number) => formatCents(cents, locale, "BRL")
  return <AffiliateShopCards shops={shops.data.map((shop) => shopCardOf(shop, money))} linkComponent={AppLink} messages={messages} />
}
