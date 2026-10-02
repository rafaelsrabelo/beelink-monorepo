// React
import { useId, type ReactNode } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CustomerCashbackView } from "@harness-monorepo/ui/lib/cashback"

export interface CustomerCashbackProps {
  cashback: CustomerCashbackView
  money: (cents: number) => string
  /** "30 de out. de 2026". */
  date: (iso: string) => string
  /** Opens the adjustment; absent, there is no button. */
  onAdjust?: () => void
  /** The adjustment's form, drawn in place of the button while it is open. */
  adjustment?: ReactNode
  /** Under the statement: its pager, built by the screen. */
  pager?: ReactNode
  messages?: UiMessages
}

/**
 * A customer's cashback on their record (BEELINK-242): the balance, what waits on deliveries, the
 * soonest part of the balance to expire, and the statement — each line what moved the balance, by
 * how much, and why. The figures are the API's; nothing is added up here.
 */
export function CustomerCashback({ cashback, money, date, onAdjust, adjustment, pager, messages = defaultMessages }: CustomerCashbackProps) {
  const text = messages.cashback.customer
  const kinds = messages.cashback.entryKinds
  const titleId = useId()
  const signed = (cents: number) => (cents > 0 ? `+ ${money(cents)}` : `− ${money(-cents)}`)

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="font-semibold">
          {text.title}
        </h2>
        {onAdjust && !adjustment ? (
          <Button type="button" variant="outline" size="sm" onClick={onAdjust}>
            {text.adjust}
          </Button>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="bg-shell-surface border-shell-border flex flex-col gap-1 rounded-xl border p-4 shadow-xs">
          <dt className="text-muted-foreground text-xs">{text.balance}</dt>
          <dd className="text-lg font-semibold tabular-nums">{money(cashback.balanceCents)}</dd>
          <dd className="text-muted-foreground text-xs">
            {cashback.nextExpiry ? format(text.nextExpiry, { amount: money(cashback.nextExpiry.amountCents), date: date(cashback.nextExpiry.expiresAt) }) : text.noExpiry}
          </dd>
        </div>
        <div className="bg-shell-surface border-shell-border flex flex-col gap-1 rounded-xl border p-4 shadow-xs">
          <dt className="text-muted-foreground text-xs">{text.pending}</dt>
          <dd className="text-lg font-semibold tabular-nums">{money(cashback.pendingCents)}</dd>
        </div>
      </dl>

      {adjustment}

      <h3 className="text-sm font-medium">{text.statement}</h3>
      {cashback.entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.empty}</p>
      ) : (
        <ul className="bg-shell-surface border-shell-border divide-border flex flex-col divide-y rounded-xl border shadow-xs">
          {cashback.entries.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium">{kinds[entry.kind]}</span>
                <span className="text-muted-foreground text-xs">
                  {[date(entry.createdAt), entry.orderNumber === null ? null : format(text.order, { number: String(entry.orderNumber) })].filter(Boolean).join(" · ")}
                </span>
                {entry.reason ? <span className="text-muted-foreground text-xs break-words">{entry.reason}</span> : null}
              </span>
              <span className={cn("text-sm font-medium whitespace-nowrap tabular-nums", entry.amountCents < 0 && "text-muted-foreground")}>{signed(entry.amountCents)}</span>
            </li>
          ))}
        </ul>
      )}
      {pager}
    </section>
  )
}
