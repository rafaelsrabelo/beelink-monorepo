// Types
import type { CustomerOrder, OrderStatus } from "@harness-monorepo/contracts"
import type { StorefrontOrderStep } from "@harness-monorepo/ui/blocks/storefront/storefront-order-steps"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { momentOf } from "./order-card-view"

type StepStatus = Exclude<OrderStatus, "CANCELLED">

/** How far along each status is: a status the line skips still sits between its neighbours. */
const RANK: Record<StepStatus, number> = { RECEIVED: 0, ACCEPTED: 1, PREPARING: 2, OUT_FOR_DELIVERY: 3, DELIVERED: 4 }

/** A pick-up never goes out for delivery; its last step is the shopper taking it at the shop. */
const LINE: Record<CustomerOrder["fulfillment"], readonly StepStatus[]> = {
  DELIVERY: ["RECEIVED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"],
  PICKUP: ["RECEIVED", "ACCEPTED", "PREPARING", "DELIVERED"],
}

/**
 * The steps of an order's way, in the shopper's words, from its status and its timeline; null for a
 * cancelled order, which says when and by whom instead. The shop may skip a status or go back one:
 * a step behind the status is done, with its moment when there is one, and a step ahead waits.
 */
export function orderStepsOf(
  order: Pick<CustomerOrder, "status" | "fulfillment" | "placedAt" | "events">,
  { locale, messages }: { locale: string; messages: UiMessages },
): StorefrontOrderStep[] | null {
  if (order.status === "CANCELLED") return null

  const text = messages.storefront
  const labels: Record<StepStatus, string> = {
    RECEIVED: text.orderStepPlaced,
    ACCEPTED: text.orderStepAccepted,
    PREPARING: text.orderStepPreparing,
    OUT_FOR_DELIVERY: text.orderStepOut,
    DELIVERED: order.fulfillment === "PICKUP" ? text.orderStepPickedUp : text.orderStepDelivered,
  }
  const at = RANK[order.status]
  const finished = order.status === "DELIVERED"

  return LINE[order.fulfillment].map((status) => {
    const rank = RANK[status]
    const state = finished || rank < at ? "done" : rank === at ? "current" : "todo"
    // An order the shop placed was never "received", yet it was placed: its first step is its placing.
    const moment = status === "RECEIVED" ? order.placedAt : order.events.findLast((event) => event.status === status)?.at
    return { label: labels[status], when: state !== "todo" && moment ? momentOf(moment, locale) : null, state }
  })
}
