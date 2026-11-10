"use client"

// UI
import { GestorCouponList } from "@harness-monorepo/ui/blocks/gestor/gestor-coupon-list"
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { couponRowsOf } from "@/lib/discount-view"
import { useCoupons, useSetCouponActive } from "@/services/promotions/promotion-hooks"

/** Every coupon a shop has, on one screen: a counter switches a handful, it does not page through them. */
const COUPONS_SHOWN = 100

export interface GestorCouponsScreenProps {
  slug: string
  locale: string
  messages: UiMessages
  web: WebMessages
}

/** The manager's coupons: switched on and off from the counter; made and changed in the panel's form. */
export function GestorCouponsScreen({ slug, locale, messages, web }: GestorCouponsScreenProps) {
  const text = messages.gestor.coupons
  const list = useCoupons(slug, { pageSize: COUPONS_SHOWN })
  const toggle = useSetCouponActive(slug)

  if (list.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <Skeleton key={card} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!list.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-destructive text-sm">
          {pageErrorCopy(list.error, web) ?? text.failed}
        </p>
        <Button type="button" variant="outline" onClick={() => void list.refetch()}>
          {text.retry}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {toggle.error ? (
        <p role="alert" className="text-destructive text-sm">
          {pageErrorCopy(toggle.error, web)}
        </p>
      ) : null}
      <GestorCouponList
        rows={couponRowsOf(list.data.coupons, { locale, messages })}
        onToggle={(id, active) => toggle.mutate({ id, active })}
        pendingId={toggle.isPending ? (toggle.variables?.id ?? null) : null}
        createHref={`/admin/${slug}/coupons/new`}
        editHrefOf={(id) => `/admin/${slug}/coupons/${id}`}
        linkComponent={AppLink}
        messages={messages}
      />
    </div>
  )
}
