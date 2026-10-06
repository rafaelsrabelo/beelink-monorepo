// React
import { useId } from "react"

// Libs
import { TriangleAlertIcon } from "lucide-react"

// UI
import type { OrderPaymentView } from "@harness-monorepo/ui/lib/order-payment"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface OrderPaymentCardProps {
  /** The order's charge: the one standing, else the last tried. Null while it has none. */
  payment: OrderPaymentView | null
  money: (cents: number) => string
  /** "6 de outubro de 2026 às 10:02", in the shop's own words for a moment. */
  when: (iso: string) => string
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
 * ask for — paid after it was cancelled, or paid twice — is drawn here for as long as it stands,
 * with what the shop does about it: bee-link gives nothing back on its own.
 */
export function OrderPaymentCard({ payment, money, when, messages = defaultMessages }: OrderPaymentCardProps) {
  const text = messages.orders.detail.onlinePayment
  const methods = messages.orders.payments
  const titleId = useId()
  const strayId = useId()
  const hint = payment ? (text.statusHints as Partial<Record<string, string>>)[payment.status] : null
  const said = payment?.providerStatus ? (text.providerStatuses as Partial<Record<string, string>>)[payment.providerStatus] : null
  const waiting = payment?.status === "PENDING" || payment?.status === "OVERDUE"

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
          </dl>
          {said ?? hint ? <p className="text-muted-foreground text-sm">{said ?? hint}</p> : null}
          {payment.lastError ? (
            <div className="flex flex-col gap-0.5 border-t pt-3">
              <span className="text-muted-foreground text-xs">{text.lastError}</span>
              {/* Asaas's own words, as they came: a long one must not run out of the card. */}
              <span className="text-sm break-words">{payment.lastError}</span>
            </div>
          ) : null}
          {payment.strays.length > 0 ? (
            <div role="group" aria-labelledby={strayId} className="border-destructive/40 bg-destructive/5 flex flex-col gap-2 rounded-lg border p-3">
              <h3 id={strayId} className="text-destructive flex items-center gap-1.5 text-sm font-semibold">
                <TriangleAlertIcon aria-hidden="true" className="size-4 shrink-0" />
                {text.strayTitle}
              </h3>
              <ul className="flex flex-col gap-2">
                {payment.strays.map((stray, index) => (
                  <li key={`${stray.paidAt}-${index}`} className="flex flex-col gap-0.5 text-sm">
                    <span>{text.strayReasons[stray.reason]}</span>
                    <span className="font-medium tabular-nums">{format(text.strayLine, { amount: money(stray.amountCents), method: methods[stray.method], date: when(stray.paidAt) })}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm">{text.strayAction}</p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">{text.none}</p>
      )}
    </section>
  )
}
