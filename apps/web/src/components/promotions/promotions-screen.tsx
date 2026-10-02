"use client"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// Types
import type { PromotionStatus } from "@harness-monorepo/contracts"

// UI
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { DiscountFailed } from "@harness-monorepo/ui/blocks/promotions/discount-failed"
import { DiscountListSkeleton } from "@harness-monorepo/ui/blocks/promotions/discount-list-skeleton"
import { DiscountStatusTabs } from "@harness-monorepo/ui/blocks/promotions/discount-status-tabs"
import { PromotionList } from "@harness-monorepo/ui/blocks/promotions/promotion-list"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { discountQueryOf, promotionHrefOf, promotionRowsOf, promotionsAddressOf, promotionsHrefOf } from "@/lib/discount-view"
import { usePromotions, useSetPromotionActive } from "@/services/promotions/promotion-hooks"
import { useLastPage } from "./use-last-page"

export interface PromotionsScreenProps {
  slug: string
  locale: string
  messages: UiMessages
  web: WebMessages
}

const STATUSES = ["ACTIVE", "SCHEDULED", "PAUSED", "ENDED"] as const satisfies readonly PromotionStatus[]

/**
 * The shop's promotions (BEELINK-192): listed by where each stands — the status in the address —
 * and paused or switched back on from the list. Making one and changing one happen on their own
 * pages, `promotions/new` and `promotions/<id>`, never above the list.
 */
export function PromotionsScreen({ slug, locale, messages, web }: PromotionsScreenProps) {
  const shared = messages.discounts
  const text = shared.promotions
  const router = useRouter()
  const address = promotionsAddressOf(useSearchParams())
  const list = usePromotions(slug, discountQueryOf(address))
  const toggle = useSetPromotionActive(slug)

  const hrefOf = (next: Parameters<typeof promotionsHrefOf>[2]) => promotionsHrefOf(slug, address, next)
  const goTo = (href: string) => router.push(href as Parameters<typeof router.push>[0])
  useLastPage(list.data && { rows: list.data.promotions.length, total: list.data.total, page: list.data.page, pageSize: list.data.pageSize }, (page) => hrefOf({ page }))

  const counts = list.data?.counts
  const tabs = [
    { key: "ALL", label: text.tabs.ALL, ...(counts ? { count: counts.ALL } : {}), href: hrefOf({ status: undefined }), active: address.status === undefined },
    ...STATUSES.map((status) => ({ key: status, label: text.tabs[status], ...(counts ? { count: counts[status] } : {}), href: hrefOf({ status }), active: address.status === status })),
  ]

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        {/* A basis of its own: sized by its sentence, the intro takes the whole row and pushes the button under it. */}
        <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.intro}</p>
        </div>
        <AppLink href={`/admin/${slug}/promotions/new`} className={buttonVariants()}>
          {text.create}
        </AppLink>
      </header>

      <DiscountStatusTabs tabs={tabs} linkComponent={AppLink} messages={messages} />

      {toggle.error ? <p role="alert" className="text-destructive text-sm">{pageErrorCopy(toggle.error, web)}</p> : null}

      <section aria-label={text.title} className="bg-card rounded-xl border">
        {list.isPending ? (
          <DiscountListSkeleton />
        ) : !list.data ? (
          <DiscountFailed onRetry={() => void list.refetch()} messages={messages} />
        ) : (
          <PromotionList
            rows={promotionRowsOf(list.data.promotions, { locale, messages })}
            empty={address.status !== undefined || address.page > 1 ? "filtered" : "none"}
            busyId={toggle.isPending ? toggle.variables?.id : null}
            onEdit={(row) => goTo(promotionHrefOf(slug, row.id, address))}
            onToggle={(row) => toggle.mutate({ id: row.id, active: !row.active })}
            messages={messages}
          />
        )}
      </section>

      {list.data && list.data.total > list.data.pageSize ? (
        <TablePager
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onPageChange={(page) => goTo(hrefOf({ page }))}
          busy={list.isFetching}
          rangeLabel={(from, to, total) => format(shared.range, { from: String(from), to: String(to), total: String(total) })}
        />
      ) : null}
    </div>
  )
}
