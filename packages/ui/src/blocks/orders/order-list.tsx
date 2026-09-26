// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { formatCents } from "../storefront/storefront-price"
import { OrderCards } from "./order-cards"
import { OrderTable } from "./order-table"
import type { OrderListItem } from "./order-types"

export interface OrderListProps {
  orders: readonly OrderListItem[]
  /** Where an order opens: its own page. */
  hrefOf: (number: number) => string
  /** Where the first one is registered, offered while there is none. */
  newHref: string
  /** A search or a status is on, so an empty list means "nothing matches", not "nothing yet". */
  filtered?: boolean
  locale?: string
  currency?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * A shop's orders: a table where there is room, cards on a phone behind the counter. The two are
 * drawn by CSS, not by measuring, so the server sends the right one and nothing jumps on arrival.
 * Room is the panel's main column (`@container/main`), not the window: the rail takes its share.
 */
export function OrderList({
  orders,
  hrefOf,
  newHref,
  filtered = false,
  locale = defaultLocale,
  currency = "BRL",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: OrderListProps) {
  const text = messages.orders
  const thisYear = new Date().getFullYear()
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  // An order from another year says so; this year's would only be longer for it.
  const dated = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  const rows = {
    orders,
    hrefOf,
    money: (cents: number) => formatCents(cents, locale, currency),
    when: (iso: string) => {
      const placed = new Date(iso)
      return (placed.getFullYear() === thisYear ? date : dated).format(placed)
    },
    linkComponent: Link,
    messages,
  }

  if (!orders.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
        <p className="font-medium">{filtered ? text.emptyFiltered : text.empty}</p>
        {filtered ? null : (
          <>
            <p className="text-muted-foreground max-w-md text-sm">{text.emptyHint}</p>
            <Link
              href={newHref}
              className={cn(buttonVariants(), "mt-2")}
            >
              {text.newOrder}
            </Link>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="hidden @4xl/main:block">
        <OrderTable {...rows} />
      </div>
      <div className="@4xl/main:hidden">
        <OrderCards {...rows} />
      </div>
    </>
  )
}
