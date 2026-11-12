"use client"

// UI
import { AffiliateOwedView } from "@harness-monorepo/ui/blocks/affiliates/affiliate-owed-view"
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { AffiliatesFrame } from "@/components/affiliates/affiliates-frame"
import { payoutDayFormatter } from "@/lib/affiliate-form"
import { owedViewOf } from "@/lib/affiliate-money-view"
import { affiliateDateFormatter } from "@/lib/affiliate-people"
import { useAffiliateOwed } from "@/services/affiliates/affiliate-money-hooks"

export interface AffiliateOwedScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

/** What the shop owes its affiliates, by due day (IMPULSEIA-107): the "A pagar" section. A payment is recorded on each record. */
export function AffiliateOwedScreen({ slug, locale, messages }: AffiliateOwedScreenProps) {
  const text = messages.affiliates.owed
  const owed = useAffiliateOwed(slug)

  return (
    <AffiliatesFrame slug={slug} active="owed" messages={messages}>
      <p className="text-muted-foreground text-sm">{text.intro}</p>
      {owed.isPending ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : owed.isError ? (
        <AffiliatesFailed onRetry={() => void owed.refetch()} messages={messages} />
      ) : (
        <AffiliateOwedView
          owed={owedViewOf(owed.data, {
            text,
            money: (cents) => formatCents(cents, locale, "BRL"),
            day: payoutDayFormatter(locale),
            date: affiliateDateFormatter(locale),
            hrefOf: (id) => `/admin/${slug}/affiliates/${id}`,
          })}
          linkComponent={AppLink}
          messages={messages}
        />
      )}
    </AffiliatesFrame>
  )
}
