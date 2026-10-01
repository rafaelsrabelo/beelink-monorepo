"use client"

// React
import { useRef, useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// Types
import type { CouponStatus } from "@harness-monorepo/contracts"

// UI
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { CouponForm } from "@harness-monorepo/ui/blocks/promotions/coupon-form"
import { CouponList } from "@harness-monorepo/ui/blocks/promotions/coupon-list"
import { DiscountFailed } from "@harness-monorepo/ui/blocks/promotions/discount-failed"
import { DiscountListSkeleton } from "@harness-monorepo/ui/blocks/promotions/discount-list-skeleton"
import { DiscountStatusTabs } from "@harness-monorepo/ui/blocks/promotions/discount-status-tabs"
import { Button } from "@harness-monorepo/ui/components/button"
import { useFocusOnSwap } from "@harness-monorepo/ui/hooks/use-focus-on-swap"
import type { CouponFormIssues, CouponFormValues, HalfTypedDates } from "@harness-monorepo/ui/lib/discount-form"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { couponFormOf, couponPayloadOf, emptyCoupon } from "@/lib/discount-form"
import { couponRowsOf, couponsAddressOf, couponsHrefOf, discountQueryOf } from "@/lib/discount-view"
import { useCoupons, useSaveCoupon, useSetCouponActive } from "@/services/promotions/promotion-hooks"
import { CouponUses } from "./coupon-uses"
import { useDiscountEditor } from "./use-discount-editor"
import { useLastPage } from "./use-last-page"

export interface CouponsScreenProps {
  slug: string
  locale: string
  messages: UiMessages
  web: WebMessages
}

const STATUSES = ["ACTIVE", "SCHEDULED", "PAUSED", "ENDED", "EXHAUSTED"] as const satisfies readonly CouponStatus[]
const NO_ISSUES: CouponFormIssues = {}
/** No row's id: every button of the list waits, none reads as the busy one. */
const SAVING = ""

/**
 * The shop's coupons (BEELINK-192): listed by where each stands, created and edited in a form on
 * the screen itself, paused from the list — and each with its uses, which open where the form
 * would: one panel above the list at a time, the form or a coupon's uses.
 */
export function CouponsScreen({ slug, locale, messages, web }: CouponsScreenProps) {
  const shared = messages.discounts
  const text = shared.coupons
  const router = useRouter()
  const address = couponsAddressOf(useSearchParams())
  const list = useCoupons(slug, discountQueryOf(address))
  const save = useSaveCoupon(slug)
  const toggle = useSetCouponActive(slug)
  const editor = useDiscountEditor<CouponFormValues, CouponFormIssues>(NO_ISSUES)
  const [uses, setUses] = useState<{ id: string; code: string } | null>(null)

  const hrefOf = (next: Parameters<typeof couponsHrefOf>[2]) => couponsHrefOf(slug, address, next)
  const goTo = (href: string) => router.push(href as Parameters<typeof router.push>[0])
  useLastPage(list.data && { rows: list.data.coupons.length, total: list.data.total, page: list.data.page, pageSize: list.data.pageSize }, (page) => hrefOf({ page }))

  // The form and the uses open above the list, which may be a screen away from the row whose button
  // opened them: the focus goes to the panel's first control, and the page scrolls with it.
  const panel = useRef<HTMLDivElement>(null)
  useFocusOnSwap(editor.editing ? `form:${editor.editing.id ?? "new"}` : uses ? `uses:${uses.id}` : "closed", panel)
  const counts = list.data?.counts
  const tabs = [
    { key: "ALL", label: text.tabs.ALL, ...(counts ? { count: counts.ALL } : {}), href: hrefOf({ status: undefined }), active: address.status === undefined },
    ...STATUSES.map((status) => ({ key: status, label: text.tabs[status], ...(counts ? { count: counts[status] } : {}), href: hrefOf({ status }), active: address.status === status })),
  ]

  function openNew() {
    save.reset()
    setUses(null)
    editor.open(null, emptyCoupon(new Date()))
  }

  function openEdit(couponId: string) {
    const coupon = list.data?.coupons.find((row) => row.id === couponId)
    if (!coupon) return
    save.reset()
    setUses(null)
    editor.open(coupon.id, couponFormOf(coupon))
  }

  function submit(halfTyped: HalfTypedDates) {
    if (!editor.editing) return
    const { id } = editor.editing
    const result = couponPayloadOf(editor.editing.value, shared.issues, halfTyped)
    if ("issues" in result) return editor.refuse(result.issues)
    save.mutate(
      { id, payload: result.payload },
      {
        onSuccess: () => {
          editor.close()
          // A new one is the first row of the unfiltered list: under a status or on a later page it
          // would be saved and nowhere to be seen.
          if (id === null && (address.status !== undefined || address.page > 1)) goTo(hrefOf({ status: undefined }))
        },
      },
    )
  }

  /** A field corrected takes back what the API said of the last attempt, as it takes back the field's own issue. */
  function change(value: CouponFormValues) {
    if (save.error) save.reset()
    editor.change(value)
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.intro}</p>
        </div>
        {editor.editing ? null : <Button onClick={openNew}>{text.create}</Button>}
      </header>

      <div ref={panel} className="empty:hidden">
        {editor.editing ? (
          <section aria-label={editor.editing.id ? text.editTitle : text.create} className="rounded-xl border p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">{editor.editing.id ? text.editTitle : text.create}</h2>
            <CouponForm
              value={editor.editing.value}
              onChange={change}
              issues={editor.editing.issues}
              error={pageErrorCopy(save.error, web)}
              onSubmit={submit}
              onCancel={editor.close}
              pending={save.isPending}
              messages={messages}
            />
          </section>
        ) : uses ? (
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
            // A save on its way holds the list too: opening another row would leave its refusal unheard.
            busyId={toggle.isPending ? toggle.variables?.id : save.isPending ? SAVING : null}
            onEdit={(row) => openEdit(row.id)}
            onToggle={(row) => toggle.mutate({ id: row.id, active: !row.active })}
            onUses={(row) => {
              editor.close()
              setUses({ id: row.id, code: row.code })
            }}
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
