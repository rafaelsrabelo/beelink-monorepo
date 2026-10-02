"use client"

// React
import { useRef, useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// Types
import type { CouponStatus } from "@harness-monorepo/contracts"

// UI
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { CouponList } from "@harness-monorepo/ui/blocks/promotions/coupon-list"
import { DiscountFailed } from "@harness-monorepo/ui/blocks/promotions/discount-failed"
import { DiscountListSkeleton } from "@harness-monorepo/ui/blocks/promotions/discount-list-skeleton"
import { DiscountStatusTabs } from "@harness-monorepo/ui/blocks/promotions/discount-status-tabs"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { useFocusOnSwap } from "@harness-monorepo/ui/hooks/use-focus-on-swap"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { couponHrefOf, couponRowsOf, couponsAddressOf, couponsHrefOf, discountQueryOf } from "@/lib/discount-view"
import { useCoupons, useSetCouponActive } from "@/services/promotions/promotion-hooks"
import { CouponUses } from "./coupon-uses"
import { useLastPage } from "./use-last-page"

export interface CouponsScreenProps {
  slug: string
  locale: string
  messages: UiMessages
  web: WebMessages
}

const STATUSES = ["ACTIVE", "SCHEDULED", "PAUSED", "ENDED", "EXHAUSTED"] as const satisfies readonly CouponStatus[]

/**
 * The shop's coupons (BEELINK-192): listed by where each stands, paused from the list — and each
 * with its uses, which open above the list. Making one and changing one happen on their own pages,
 * `coupons/new` and `coupons/<id>`.
 */
export function CouponsScreen({ slug, locale, messages, web }: CouponsScreenProps) {
  const shared = messages.discounts
  const text = shared.coupons
  const router = useRouter()
  const address = couponsAddressOf(useSearchParams())
  const list = useCoupons(slug, discountQueryOf(address))
  const toggle = useSetCouponActive(slug)
  const [uses, setUses] = useState<{ id: string; code: string } | null>(null)

  const hrefOf = (next: Parameters<typeof couponsHrefOf>[2]) => couponsHrefOf(slug, address, next)
  const goTo = (href: string) => router.push(href as Parameters<typeof router.push>[0])
  useLastPage(list.data && { rows: list.data.coupons.length, total: list.data.total, page: list.data.page, pageSize: list.data.pageSize }, (page) => hrefOf({ page }))

  // The uses open above the list, which may be a screen away from the row whose button opened them:
  // the focus goes to the panel's first control, and the page scrolls with it.
  const panel = useRef<HTMLDivElement>(null)
  useFocusOnSwap(uses ? `uses:${uses.id}` : "closed", panel)
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
        <AppLink href={`/admin/${slug}/coupons/new`} className={buttonVariants()}>
          {text.create}
        </AppLink>
      </header>

      <div ref={panel} className="empty:hidden">
        {uses ? (
          // Keyed by the coupon: another coupon's uses start at their own first page.
          <CouponUses key={uses.id} slug={slug} coupon={uses} locale={locale} onClose={() => setUses(null)} messages={messages} />
        ) : null}
      </div>

      <DiscountStatusTabs tabs={tabs} linkComponent={AppLink} messages={messages} />

      {toggle.error ? <p role="alert" className="text-destructive text-sm">{pageErrorCopy(toggle.error, web)}</p> : null}

      <section aria-label={text.title} className="bg-card rounded-xl border">
        {list.isPending ? (
          <DiscountListSkeleton />
        ) : !list.data ? (
          <DiscountFailed onRetry={() => void list.refetch()} messages={messages} />
        ) : (
          <CouponList
            rows={couponRowsOf(list.data.coupons, { locale, messages })}
            empty={address.status !== undefined || address.page > 1 ? "filtered" : "none"}
            busyId={toggle.isPending ? toggle.variables?.id : null}
            onEdit={(row) => goTo(couponHrefOf(slug, row.id, address))}
            onToggle={(row) => toggle.mutate({ id: row.id, active: !row.active })}
            onUses={(row) => setUses({ id: row.id, code: row.code })}
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
