// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface CouponRedemptionRow {
  id: string
  orderNumber: number
  /** The order's own page in the panel. */
  orderHref: string
  customerName: string
  /** Already in the owner's words. */
  date: string
  /** "R$ 18,99". */
  discount: string
  /** The order was cancelled: its use went back to the coupon. */
  cancelled: boolean
}

export interface CouponRedemptionsProps {
  /** Null while they are read. */
  rows: readonly CouponRedemptionRow[] | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The orders a coupon went into, the most recent first: each leading to the order, with whose it
 * was, when, and what the coupon took off. A cancelled order stays on the list, marked — its use
 * went back, and the owner should see why the count is lower than the rows.
 */
export function CouponRedemptions({ rows, linkComponent: Link = AnchorLink, messages = defaultMessages }: CouponRedemptionsProps) {
  const text = messages.discounts.coupons

  if (rows === null) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">{text.usesEmpty}</p>

  return (
    <ul className="divide-border flex flex-col divide-y rounded-lg border">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2">
          <div className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-2">
              <Link href={row.orderHref} className="text-sm font-medium hover:underline">
                {format(text.useOrder, { number: String(row.orderNumber) })}
              </Link>
              {row.cancelled ? (
                <Badge variant="outline" className="text-muted-foreground">
                  {text.useCancelled}
                </Badge>
              ) : null}
            </span>
            <span className="text-muted-foreground text-xs">{format(text.useByOn, { name: row.customerName, date: row.date })}</span>
          </div>
          <span className="text-sm tabular-nums">{format(text.useTook, { amount: row.discount })}</span>
        </li>
      ))}
    </ul>
  )
}
