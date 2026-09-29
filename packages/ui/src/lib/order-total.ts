// Locales
import { format } from "@harness-monorepo/ui/locales/index"

// Types
import type { OrderFulfillmentValue } from "@harness-monorepo/ui/lib/order-form"

/** What a total is written from: how the order is handed over, its fee, and — when known — its status. */
interface TotalOf {
  fulfillment: OrderFulfillmentValue
  deliveryFeeCents: number | null
  status?: string
}

/**
 * A delivery's fee not agreed yet (BEELINK-170): the wire's null, never zero, which is free. A
 * cancelled order has nothing left to agree: its total is what it was.
 */
export function feeToAgree(order: TotalOf): boolean {
  return order.fulfillment === "DELIVERY" && order.deliveryFeeCents === null && order.status !== "CANCELLED"
}

/** A total as the panel writes it: "R$ 239,70 + frete" while the fee is not agreed, so it never reads as final. */
export function orderTotalText(total: string, order: TotalOf, plusFee: string): string {
  return feeToAgree(order) ? format(plusFee, { total }) : total
}
