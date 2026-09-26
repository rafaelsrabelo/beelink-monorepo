// React
import { useId } from "react"
import type { ReactNode } from "react"

// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { OrderStatusBadge } from "../orders/order-status-badge"
import { itemsLabel } from "../orders/order-table"
import type { OrderListItem } from "../orders/order-types"
import { formatCents } from "../storefront/storefront-price"

/** One order of the history: the list's row without the customer, who is the record's. */
export type CustomerOrderItem = Pick<OrderListItem, "number" | "status" | "paymentMethod" | "totalCents" | "itemsCount" | "placedAt">

export interface CustomerOrdersProps {
  orders: readonly CustomerOrderItem[]
  /** Where an order opens: its own page. */
  hrefOf: (number: number) => string
  /** The first page is on its way: rows the height of the real ones, never a spinner. */
  loading?: boolean
  /** Drawn under the rows — the pager, when there is more than one page. */
  pager?: ReactNode
  locale?: string
  currency?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Every order the customer made, most recent first, cancelled ones included — each one a link to
 * its page. The number is the row's one link, stretched over it, so the whole row opens the order
 * and a screen reader hears "Abrir o pedido #14"; the rest stays text it reads.
 */
export function CustomerOrders({
  orders,
  hrefOf,
  loading = false,
  pager,
  locale = defaultLocale,
  currency = "BRL",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: CustomerOrdersProps) {
  const text = messages.customers.record
  const titleId = useId()
  const money = (cents: number) => formatCents(cents, locale, currency)
  const thisYear = new Date().getFullYear()
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  // An order from another year says so; this year's would only be longer for it.
  const dated = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  const when = (iso: string) => {
    const placed = new Date(iso)
    return (placed.getFullYear() === thisYear ? date : dated).format(placed)
  }

  return (
    <section aria-labelledby={titleId} className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
      <h2 id={titleId} className="font-semibold">
        {text.history}
      </h2>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-10 text-center">
          <p className="font-medium">{text.historyEmpty}</p>
          <p className="text-muted-foreground max-w-sm text-sm">{text.historyEmptyHint}</p>
        </div>
      ) : (
        <ul className="divide-y">
          {orders.map((order) => (
            <li
              key={order.number}
              className="has-focus-visible:ring-ring relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md py-3 has-focus-visible:ring-2"
            >
              <span className="flex min-w-0 flex-col">
                <Link
                  href={hrefOf(order.number)}
                  aria-label={format(text.openOrder, { number: String(order.number) })}
                  className="font-medium tabular-nums outline-none after:absolute after:inset-0 hover:underline"
                >
                  #{order.number}
                </Link>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {when(order.placedAt)} · {itemsLabel(order.itemsCount, messages)} · {messages.orders.payments[order.paymentMethod]}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-medium tabular-nums">{money(order.totalCents)}</span>
                <OrderStatusBadge status={order.status} messages={messages} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {pager}
    </section>
  )
}
