// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { discountLinesOf, linePromotionOf } from "@harness-monorepo/ui/lib/order-discounts"
import { feeLineOf, orderTotalText } from "@harness-monorepo/ui/lib/order-total"
import type { OrderDetailView } from "./order-types"

export interface OrderItemsProps {
  order: Pick<
    OrderDetailView,
    "items" | "subtotalCents" | "deliveryFeeCents" | "discountCents" | "promotionDiscountCents" | "couponDiscountCents" | "coupon" | "cashbackUsedCents" | "totalCents" | "fulfillment" | "status"
  >
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
 *
 * What came off has a row per part — the promotions, the coupon with its code, what the shopkeeper
 * typed (BEELINK-194) — and a line a promotion reached says which, and how much.
 */
export function OrderItems({ order, money, messages = defaultMessages }: OrderItemsProps) {
  const text = messages.orders.detail
  const fee = feeLineOf(order)
  const discounts = discountLinesOf(order, money, messages.orders.discountRows)

  return (
    <section aria-labelledby="order-items-title" className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs">
      <h2 id="order-items-title" className="font-semibold">
        {text.items}
      </h2>
      <ul className="divide-border flex flex-col divide-y">
        {order.items.map((item) => {
          const promotion = linePromotionOf(item, money, messages.orders.discountRows)
          return (
            <li key={item.id} className="flex items-start justify-between gap-3 py-2 first:pt-0">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium">{item.productName}</span>
                {item.variantLabel || item.sku ? (
                  <span className="text-muted-foreground text-xs">{[item.variantLabel, item.sku].filter(Boolean).join(" · ")}</span>
                ) : null}
                <span className="text-muted-foreground text-xs tabular-nums">
                  {item.quantity} × {money(item.unitPriceCents)}
                </span>
                {promotion ? <span className="text-xs tabular-nums">{promotion}</span> : null}
              </span>
              <span className="text-sm font-medium tabular-nums">{money(item.lineTotalCents)}</span>
            </li>
          )
        })}
      </ul>
      <dl className="flex flex-col gap-2">
        <Row label={text.subtotal} value={money(order.subtotalCents)} />
        {fee !== null ? <Row label={text.fee} value={fee === "toAgree" ? text.feeToAgree : money(fee.cents)} /> : null}
        {discounts.map((row) => (
          <Row key={row.key} label={row.label} value={row.value} />
        ))}
        <Row label={text.total} value={orderTotalText(money(order.totalCents), order, messages.orders.totalPlusFee)} strong />
      </dl>
    </section>
  )
}
