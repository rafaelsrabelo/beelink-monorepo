"use client"

// React
import { useState } from "react"

// UI
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { CouponRedemptions } from "@harness-monorepo/ui/blocks/promotions/coupon-redemptions"
import { DiscountFailed } from "@harness-monorepo/ui/blocks/promotions/discount-failed"
import { Button } from "@harness-monorepo/ui/components/button"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { redemptionRowsOf } from "@/lib/discount-view"
import { useCouponRedemptions } from "@/services/promotions/promotion-hooks"

export interface CouponUsesProps {
  slug: string
  coupon: { id: string; code: string }
  locale: string
  onClose: () => void
  messages: UiMessages
}

/**
 * One coupon's uses, opened from its row: the orders it went into, a page at a time. The page is
 * this panel's own state and not the address — it belongs to a panel that closes, and the address
 * already says which list is behind it.
 */
export function CouponUses({ slug, coupon, locale, onClose, messages }: CouponUsesProps) {
  const shared = messages.discounts
  const text = shared.coupons
  const [page, setPage] = useState(1)
  const uses = useCouponRedemptions(slug, coupon.id, page > 1 ? { page } : {})
  const title = format(text.usesTitle, { code: coupon.code })

  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm">{text.usesIntro}</p>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          {text.usesClose}
        </Button>
      </header>

      {uses.isPending ? (
        <CouponRedemptions rows={null} messages={messages} />
      ) : !uses.data ? (
        <DiscountFailed onRetry={() => void uses.refetch()} messages={messages} />
      ) : (
        <CouponRedemptions rows={redemptionRowsOf(uses.data.redemptions, slug, locale)} linkComponent={AppLink} messages={messages} />
      )}

      {uses.data && uses.data.total > uses.data.pageSize ? (
        <TablePager
          page={uses.data.page}
          pageSize={uses.data.pageSize}
          total={uses.data.total}
          onPageChange={setPage}
          busy={uses.isFetching}
          rangeLabel={(from, to, total) => format(shared.range, { from: String(from), to: String(to), total: String(total) })}
        />
      ) : null}
    </section>
  )
}
