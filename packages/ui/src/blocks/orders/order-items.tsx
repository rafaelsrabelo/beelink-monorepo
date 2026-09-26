// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderDetailView } from "./order-types"

export interface OrderItemsProps {
  order: Pick<OrderDetailView, "items" | "subtotalCents" | "deliveryFeeCents" | "discountCents" | "totalCents" | "fulfillment">
  money: (cents: number) => string
  messages?: UiMessages
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-4 border-t pt-3 text-base font-semibold" : "text-muted-foreground flex justify-between gap-4 text-sm"}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * What was sold, as it was photographed: the name, combination, code and price of the moment,
 * whatever the catalogue says today. The totals are the API's, never added up again here.
 */
export function OrderItems({ order, money, messages = defaultMessages }: OrderItemsProps) {
  const text = messages.orders.detail

  return (
    <section aria-labelledby="order-items-title" className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs">
      <h2 id="order-items-title" className="font-semibold">
        {text.items}
      </h2>
      <ul className="divide-border flex flex-col divide-y">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 py-2 first:pt-0">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{item.productName}</span>
              {item.variantLabel || item.sku ? (
                <span className="text-muted-foreground text-xs">{[item.variantLabel, item.sku].filter(Boolean).join(" · ")}</span>
              ) : null}
              <span className="text-muted-foreground text-xs tabular-nums">
                {item.quantity} × {money(item.unitPriceCents)}
              </span>
            </span>
            <span className="text-sm font-medium tabular-nums">{money(item.lineTotalCents)}</span>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-2">
        <Row label={text.subtotal} value={money(order.subtotalCents)} />
        {order.fulfillment === "DELIVERY" ? <Row label={text.fee} value={money(order.deliveryFeeCents)} /> : null}
        {order.discountCents > 0 ? <Row label={text.discount} value={`− ${money(order.discountCents)}`} /> : null}
        <Row label={text.total} value={money(order.totalCents)} strong />
      </dl>
    </section>
  )
}
