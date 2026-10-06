// React
import { useId } from "react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { isRefundable, type OrderPaymentView } from "@harness-monorepo/ui/lib/order-payment"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { OrderPaymentRefunds } from "./order-payment-refunds"
import { OrderPaymentStrays } from "./order-payment-strays"

export interface OrderPaymentCardProps {
  /** The order's charge: the one standing, else the last tried. Null while it has none. */
  payment: OrderPaymentView | null
  money: (cents: number) => string
  /** "6 de outubro de 2026 às 10:02", in the shop's own words for a moment. */
  when: (iso: string) => string
  /** The refund's own screen (BEELINK-208): offered while the shop holds money a refund may still ask for. */
  refundHref?: string
  /** The same screen for money the order did not ask for, by its id. */
  strayRefundHref?: (strayId: string) => string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  )
}

/**
 * The online payment of an order, as its shop reads it (BEELINK-207): how it is paid, how much,
 * where it stands in words, when it was paid, and what Asaas last refused. Money the order did not
 * ask for — paid after it was cancelled, or paid twice — is drawn here for as long as the shop has
 * not given it back. What went back, what is on its way and what is left to refund are said too,
 * with the way to the refund and every refund made (BEELINK-208).
 */
export function OrderPaymentCard({ payment, money, when, refundHref, strayRefundHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: OrderPaymentCardProps) {
  const text = messages.orders.detail.onlinePayment
  const methods = messages.orders.payments
  const titleId = useId()
  const hint = payment ? (text.statusHints as Partial<Record<string, string>>)[payment.status] : null
  const said = payment?.providerStatus ? (text.providerStatuses as Partial<Record<string, string>>)[payment.providerStatus] : null
  const waiting = payment?.status === "PENDING" || payment?.status === "OVERDUE"
  const refundable = isRefundable(payment)
  const unsettled = payment ? payment.strays.filter((stray) => stray.resolvedAt === null) : []
  // Paid after the order was cancelled: the payment itself is the money to give back, and its notice carries the way to it.
  const strayIsPayment = unsettled.some((stray) => stray.reason === "ORDER_CANCELLED")
  const gaveBack = payment ? payment.refundedCents > 0 || payment.refundingCents > 0 : false

  return (
    <section aria-labelledby={titleId} className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
      <h2 id={titleId} className="font-semibold">
        {text.title}
      </h2>
      {payment ? (
        <>
          <dl className="flex flex-col gap-2">
            <Row label={text.status}>
              <span className="font-medium">{text.statuses[payment.status]}</span>
            </Row>
            <Row label={text.method}>
              {methods[payment.method]}
              {payment.method === "CREDIT_CARD" ? ` · ${payment.installments > 1 ? format(text.installments, { count: String(payment.installments) }) : text.inFull}` : null}
            </Row>
            <Row label={text.amount}>
              <span className="tabular-nums">{money(payment.amountCents)}</span>
            </Row>
            {payment.paidAt ? (
              <Row label={text.paidAt}>
                <time dateTime={payment.paidAt}>{when(payment.paidAt)}</time>
              </Row>
            ) : null}
            {waiting && payment.expiresAt ? (
              <Row label={text.expiresAt}>
                <time dateTime={payment.expiresAt}>{when(payment.expiresAt)}</time>
              </Row>
            ) : null}
            {payment.refundedCents > 0 ? (
              <Row label={text.refunded}>
                <span className="tabular-nums">{money(payment.refundedCents)}</span>
              </Row>
            ) : null}
            {payment.refundingCents > 0 ? (
              <Row label={text.refunding}>
                <span className="tabular-nums">{money(payment.refundingCents)}</span>
              </Row>
            ) : null}
            {gaveBack && refundable ? (
              <Row label={text.refundable}>
                <span className="tabular-nums">{money(payment.refundableCents)}</span>
              </Row>
            ) : null}
          </dl>
          {said ?? hint ? <p className="text-muted-foreground text-sm">{said ?? hint}</p> : null}
          {payment.lastError ? (
            <div className="flex flex-col gap-0.5 border-t pt-3">
              <span className="text-muted-foreground text-xs">{text.lastError}</span>
              {/* Asaas's own words, as they came: a long one must not run out of the card. */}
              <span className="text-sm break-words">{payment.lastError}</span>
            </div>
          ) : null}
          {refundable && refundHref && !strayIsPayment ? (
            <Link href={refundHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
              {text.refund}
            </Link>
          ) : null}
          <OrderPaymentRefunds refunds={payment.refunds} money={money} when={when} messages={messages} />
          <OrderPaymentStrays strays={unsettled} refundHref={strayRefundHref} money={money} when={when} linkComponent={Link} messages={messages} />
        </>
      ) : (
        <p className="text-muted-foreground text-sm">{text.none}</p>
      )}
    </section>
  )
}
