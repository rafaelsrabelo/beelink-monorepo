// React
import { useId } from "react"

// UI
import type { OrderRefundView } from "@harness-monorepo/ui/lib/order-payment"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface OrderPaymentRefundsProps {
  refunds: readonly OrderRefundView[]
  money: (cents: number) => string
  when: (iso: string) => string
  messages: UiMessages
}

const TONE: Record<OrderRefundView["status"], string> = {
  REQUESTED: "text-foreground",
  PROCESSING: "text-foreground",
  DONE: "text-foreground",
  REFUSED: "text-destructive",
  DENIED: "text-destructive",
}

/**
 * Every refund of an order, as its shop reads them (BEELINK-208), the oldest first: how much, where
 * it stands, when, where it came from and why — and, of one that did not go through, what Asaas
 * said, in its words.
 */
export function OrderPaymentRefunds({ refunds, money, when, messages }: OrderPaymentRefundsProps) {
  const text = messages.orders.detail.onlinePayment
  const titleId = useId()
  if (refunds.length === 0) return null

  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-col gap-2 border-t pt-3">
      <h3 id={titleId} className="text-sm font-semibold">
        {text.refundsTitle}
      </h3>
      <ul className="flex flex-col gap-3">
        {refunds.map((refund) => (
          <li key={refund.id} className="flex flex-col gap-0.5 text-sm">
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-medium tabular-nums">{money(refund.amountCents)}</span>
              <span className={cn("text-right font-medium", TONE[refund.status])}>{text.refundStatuses[refund.status]}</span>
            </span>
            <span className="text-muted-foreground text-xs">
              <time dateTime={refund.doneAt ?? refund.requestedAt}>{when(refund.doneAt ?? refund.requestedAt)}</time>
              {" · "}
              {refund.stray ? text.refundStray : text.refundOrigins[refund.origin]}
            </span>
            {/* The shop's own words, and Asaas's: a long one must not run out of the card. */}
            {refund.reason ? <span className="break-words">{refund.reason}</span> : null}
            {refund.lastError ? <span className="text-destructive break-words">{refund.lastError}</span> : null}
            {refund.status === "REQUESTED" ? <span className="text-muted-foreground">{text.refundRequestedHint}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
