// UI
import { orderPaymentStateOf } from "@harness-monorepo/ui/lib/order-payment"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderListItem } from "./order-types"

export interface OrderPaymentCellProps {
  order: Pick<OrderListItem, "status" | "paymentMethod" | "paymentChannel" | "payment" | "strays">
  /** Stacked in the table's cell, in one line on a card. */
  inline?: boolean
  messages: UiMessages
}

/**
 * How a row of the list is paid (BEELINK-207): the way, and — on an order charged online — where
 * its money stands, in words. Money the order did not ask for is flagged, so the shop finds the
 * order it has to settle without opening each one.
 */
export function OrderPaymentCell({ order, inline = false, messages }: OrderPaymentCellProps) {
  const text = messages.orders
  const state = orderPaymentStateOf(order)

  return (
    <span className={cn("flex", inline ? "flex-wrap items-baseline justify-end gap-x-1.5" : "flex-col")}>
      <span>{text.payments[order.paymentMethod]}</span>
      {state ? <span className={cn("text-xs", state === "paid" ? "text-foreground font-medium" : "text-muted-foreground")}>{text.paymentStates[state]}</span> : null}
      {order.strays ? <span className="text-destructive text-xs font-medium">{text.paymentStray}</span> : null}
    </span>
  )
}
