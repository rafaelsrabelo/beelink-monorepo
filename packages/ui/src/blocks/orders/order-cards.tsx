// Locales
import { format } from "@harness-monorepo/ui/locales/index"

// Block
import { OrderStatusBadge } from "./order-status-badge"
import { itemsLabel, type OrderRowsProps } from "./order-table"

/**
 * The list as cards, on a phone behind the counter: the number, who, how much and where it stands.
 * The number is the card's one link, stretched over it as the table's is: the rest stays text a
 * screen reader reads, where a label on a card-wide link would have silenced it.
 */
export function OrderCards({ orders, hrefOf, money, when, linkComponent: Link, messages }: OrderRowsProps) {
  const text = messages.orders

  return (
    <ul className="flex flex-col gap-2">
      {orders.map((order) => (
        <li
          key={order.number}
          className="bg-shell-surface border-shell-border has-focus-visible:ring-ring relative flex flex-col gap-2 rounded-xl border p-3 shadow-xs has-focus-visible:ring-2"
        >
          <span className="flex items-center justify-between gap-2">
            <Link
              href={hrefOf(order.number)}
              aria-label={format(text.open, { number: String(order.number), name: order.customer.name })}
              className="font-medium tabular-nums outline-none after:absolute after:inset-0 after:rounded-xl"
            >
              #{order.number}
            </Link>
            <OrderStatusBadge status={order.status} messages={messages} />
          </span>
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{order.customer.name}</span>
              {order.customer.phone ? <span className="text-muted-foreground text-xs tabular-nums">{order.customer.phone}</span> : null}
            </span>
            <span className="font-medium tabular-nums">{money(order.totalCents)}</span>
          </span>
          <span className="text-muted-foreground flex justify-between gap-2 text-xs">
            <span className="tabular-nums">{when(order.placedAt)}</span>
            <span>
              {itemsLabel(order.itemsCount, messages)} · {text.payments[order.paymentMethod]}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
