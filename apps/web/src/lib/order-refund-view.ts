// Types
import type { CustomerOrder } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { dayOf } from "./order-card-view"

interface RefundContext {
  locale: string
  messages: UiMessages
}

type RefundedOrder = Pick<CustomerOrder, "paymentChannel" | "payment">

const refundsOf = (order: RefundedOrder) => (order.paymentChannel === "ONLINE" ? (order.payment?.refunds ?? []) : [])

/**
 * Each refund of the order's payment, in the customer's words (BEELINK-208): how much, and when it
 * went back — or since when it is on its way, which on a card takes days. Never why: the reason is
 * the shop's own note, and the API does not send it here.
 */
export function orderRefundLinesOf(order: RefundedOrder, { locale, messages }: RefundContext): string[] {
  const text = messages.storefront
  return refundsOf(order).map((refund) => {
    const amount = formatCents(refund.amountCents, locale, "BRL")
    return refund.status === "DONE"
      ? format(text.orderRefundDone, { amount, date: dayOf(refund.doneAt ?? refund.requestedAt, locale) })
      : format(text.orderRefundProcessing, { amount, date: dayOf(refund.requestedAt, locale) })
  })
}

/** One change of an order's history, before it is worded by day and time. */
export interface OrderMove {
  at: string
  title: string
  detail: string | null
}

/**
 * An order's changes with its refunds among them: money given back is a change too, told from when
 * Asaas took it, where it fell among the others — and never before the order's own placing.
 */
export function withRefundMoves(moves: readonly OrderMove[], order: RefundedOrder, { locale, messages }: RefundContext): OrderMove[] {
  const text = messages.storefront
  return refundsOf(order).reduce<OrderMove[]>((line, refund) => {
    const move = { at: refund.requestedAt, title: format(text.orderEventRefund, { amount: formatCents(refund.amountCents, locale, "BRL") }), detail: refund.status === "DONE" ? null : text.orderPayRefunding }
    const after = Math.max(line.findLastIndex((each) => each.at <= move.at), 0)
    return [...line.slice(0, after + 1), move, ...line.slice(after + 1)]
  }, [...moves])
}
