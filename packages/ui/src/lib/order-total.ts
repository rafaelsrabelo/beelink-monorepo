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

/**
 * A delivery's fee line, on the same rule as the total: the amount once agreed (zero is free),
 * "a combinar" while it is not, and no line for a pick-up or for a cancelled order that never
 * agreed one — "a combinar" there would promise a conversation that is over.
 */
export function feeLineOf(order: TotalOf): { cents: number } | "toAgree" | null {
  if (order.fulfillment !== "DELIVERY") return null
  if (order.deliveryFeeCents !== null) return { cents: order.deliveryFeeCents }
  return feeToAgree(order) ? "toAgree" : null
}

/** A total as the panel writes it: "R$ 239,70 + frete" while the fee is not agreed, so it never reads as final. */
export function orderTotalText(total: string, order: TotalOf, plusFee: string): string {
  return feeToAgree(order) ? format(plusFee, { total }) : total
}

/**
 * A total as its customer reads it. A free-delivery coupon waives whatever fee is agreed
 * (BEELINK-194), so to them such a total is final: "+ frete" beside it would read as more to pay.
 * The panel keeps `orderTotalText`, where "+ frete" says the fee is still to be told.
 */
export function customerTotalText(total: string, order: TotalOf & { coupon: { kind: string } | null }, plusFee: string): string {
  return order.coupon?.kind === "FREE_SHIPPING" ? total : orderTotalText(total, order, plusFee)
}
