// Locales
import { format } from "@harness-monorepo/ui/locales/index"

// Block
import { OrderStatusBadge } from "./order-status-badge"
import { itemsLabel, type OrderRowsProps } from "./order-table"

/** The list as cards, on a phone behind the counter: the number, who, how much and where it stands. */
export function OrderCards({ orders, hrefOf, money, when, linkComponent: Link, messages }: OrderRowsProps) {
  const text = messages.orders

  return (
    <ul className="flex flex-col gap-2">
      {orders.map((order) => (
        <li key={order.number}>
          <Link
            href={hrefOf(order.number)}
            aria-label={format(text.open, { number: String(order.number), name: order.customer.name })}
            className="bg-shell-surface border-shell-border focus-visible:ring-ring flex flex-col gap-2 rounded-xl border p-3 shadow-xs outline-none focus-visible:ring-2"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium tabular-nums">#{order.number}</span>
              <OrderStatusBadge status={order.status} messages={messages} />
            </span>
            <span className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate">{order.customer.name}</span>
              <span className="font-medium tabular-nums">{money(order.totalCents)}</span>
            </span>
            <span className="text-muted-foreground flex justify-between gap-2 text-xs">
              <span className="tabular-nums">{when(order.placedAt)}</span>
              <span>
                {itemsLabel(order.itemsCount, messages)} · {text.payments[order.paymentMethod]}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
