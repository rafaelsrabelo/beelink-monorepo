// Types
import type { CustomerOrder, OrderPaymentStatus, OrderStatus } from "@harness-monorepo/contracts"
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

/** A charge that was paid, wherever the money is now: the step says it was approved, and the payment box says a refund. */
const APPROVED: readonly OrderPaymentStatus[] = ["CONFIRMED", "RECEIVED", "PARTIALLY_REFUNDED", "REFUNDED"]

/**
 * The payment's own step, on an order charged online (BEELINK-207), in the payment box's very words.
 * Approved, with when, once the charge was paid; until then it says it waits — the step the order
 * is at while the shop has not moved it, and one still to come, between steps done, when the shop
 * went ahead without the money.
 */
function paymentStepOf(order: Pick<CustomerOrder, "status" | "payment">, { locale, messages }: { locale: string; messages: UiMessages }): StorefrontOrderStep {
  const text = messages.storefront
  const payment = order.payment
  const approved = payment !== null && APPROVED.includes(payment.status)
  const state = order.status === "RECEIVED" ? "current" : approved ? "done" : "todo"
  return { label: approved ? text.orderPayApproved : text.orderPayAwaiting, when: approved && payment.paidAt ? momentOf(payment.paidAt, locale) : null, state }
}

/**
 * The steps of an order's way, in the shopper's words, from its status and its timeline; null for a
 * cancelled order, which says when and by whom instead. The shop may skip a status or go back one:
 * a step behind the status is done, with its moment when there is one, and a step ahead waits.
 * An order charged online has its payment as the second step; one settled with the shop reads as
 * it always did — bee-link never knows that one paid.
 */
export function orderStepsOf(
  order: Pick<CustomerOrder, "status" | "fulfillment" | "placedAt" | "events" | "paymentChannel" | "payment">,
  context: { locale: string; messages: UiMessages },
): StorefrontOrderStep[] | null {
  const { locale, messages } = context
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

  const online = order.paymentChannel === "ONLINE"

  const steps = LINE[order.fulfillment].map((status): StorefrontOrderStep => {
    const rank = RANK[status]
    // Placed is done with as soon as there is a payment to wait for: the payment's step is where it is at.
    const state = finished || rank < at || (online && status === "RECEIVED") ? "done" : rank === at ? "current" : "todo"
    // An order the shop placed was never "received", yet it was placed: its first step is its placing.
    const moment = status === "RECEIVED" ? order.placedAt : order.events.findLast((event) => event.status === status)?.at
    return { label: labels[status], when: state !== "todo" && moment ? momentOf(moment, locale) : null, state }
  })
  return online ? [steps[0]!, paymentStepOf(order, context), ...steps.slice(1)] : steps
}
