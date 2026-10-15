"use client"

// UI
import { SubscriptionLocked } from "@harness-monorepo/ui/blocks/billing/subscription-locked"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import type { PageLockView } from "@/lib/page-lock-view"
import { offersOf, subscribePageOf } from "@/lib/subscribe-view"
import { usePlanCatalog } from "@/services/billing/billing-hooks"
import { useMyStores } from "@/services/stores/store-hooks"

export interface PageLockedLiveProps {
  slug: string
  lock: PageLockView
  locale: string
  messages: UiMessages
}

/**
 * A locked page's notice, wired (BEELINK-296). The page's name, logo and kind come from the account's
 * list of pages, which the shell reads already — the page's own read is locked too (BEELINK-223). The
 * plan on sale and each cycle's figures come from the catalogue, worked out as the Assinar screen does
 * them (`offersOf`), so the two never say different amounts.
 */
export function PageLockedLive({ slug, lock, locale, messages }: PageLockedLiveProps) {
  const stores = useMyStores()
  const catalog = usePlanCatalog()
  const page = stores.data?.find((store) => store.slug === slug) ?? null
  const sale = catalog.data ? offersOf(catalog.data, null, new Date(), locale) : null

  return (
    <SubscriptionLocked
      reason={lock.reason}
      endedOn={lock.endedOn}
      page={page ? { name: page.name, logoUrl: page.logoUrl } : null}
      shop={page !== null && page.type !== "INSTITUTIONAL"}
      otherPages={(stores.data?.length ?? 0) > 1}
      plan={sale ? { name: sale.plan.name, offers: sale.offers } : null}
      planPending={catalog.isPending}
      subscribeHref={subscribePageOf(slug)}
      locale={locale}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
