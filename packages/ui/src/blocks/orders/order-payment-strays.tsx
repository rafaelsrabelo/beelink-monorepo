// React
import { useId } from "react"

// Libs
import { TriangleAlertIcon } from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import type { StrayPaymentView } from "@harness-monorepo/ui/lib/order-payment"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"

export interface OrderPaymentStraysProps {
  /** Only the ones the shop still has to settle: one given back is told among the refunds. */
  strays: readonly StrayPaymentView[]
  /** Where the refund of one is asked; absent, and the card only tells of it. */
  refundHref?: (strayId: string) => string
  money: (cents: number) => string
  when: (iso: string) => string
  linkComponent: LinkComponent
  messages: UiMessages
}

/**
 * Money the order did not ask for — paid after it was cancelled, or paid twice — for as long as the
 * shop has not given it back (BEELINK-207): why it is there, how much, and the way to its refund
 * (BEELINK-208). bee-link gives nothing back on its own.
 */
export function OrderPaymentStrays({ strays, refundHref, money, when, linkComponent: Link, messages }: OrderPaymentStraysProps) {
  const text = messages.orders.detail.onlinePayment
  const methods = messages.orders.payments
  const titleId = useId()
  if (strays.length === 0) return null

  return (
    <div role="group" aria-labelledby={titleId} className="border-destructive/40 bg-destructive/5 flex flex-col gap-2 rounded-lg border p-3">
      <h3 id={titleId} className="text-destructive flex items-center gap-1.5 text-sm font-semibold">
        <TriangleAlertIcon aria-hidden="true" className="size-4 shrink-0" />
        {text.strayTitle}
      </h3>
      <ul className="flex flex-col gap-3">
        {strays.map((stray) => (
          <li key={stray.id} className="flex flex-col items-start gap-1 text-sm">
            <span>{text.strayReasons[stray.reason]}</span>
            <span className="font-medium tabular-nums">{format(text.strayLine, { amount: money(stray.amountCents), method: methods[stray.method], date: when(stray.paidAt) })}</span>
            {refundHref && stray.refundableCents > 0 ? (
              <Link href={refundHref(stray.id)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}>
                {format(text.strayRefund, { amount: money(stray.refundableCents) })}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-sm">{text.strayAction}</p>
    </div>
  )
}
