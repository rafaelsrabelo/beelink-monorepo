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
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  const rows = {
    orders,
    hrefOf,
    money: (cents: number) => formatCents(cents, locale, currency),
    when: (iso: string) => date.format(new Date(iso)),
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-2 inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium outline-none focus-visible:ring-2"
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
      <div className="hidden md:block">
        <OrderTable {...rows} />
      </div>
      <div className="md:hidden">
        <OrderCards {...rows} />
      </div>
    </>
  )
}
