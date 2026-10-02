// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderCashbackView } from "@harness-monorepo/ui/lib/cashback"

export interface OrderCashbackProps {
  cashback: OrderCashbackView
  money: (cents: number) => string
  /** "30 de out. de 2026", in the shop's own words for a day. */
  date: (iso: string) => string
  locale?: string
  messages?: UiMessages
}

/**
 * What an order earns in cashback and where that credit stands (BEELINK-242), on the order's page:
 * pending until it is delivered, then usable until a day, or taken back. When it was taken back after
 * the customer had spent part of it, the part the balance did not get back is said — the shop's to
 * settle with the customer, since the balance never goes below zero.
 */
export function OrderCashback({ cashback, money, date, locale = defaultLocale, messages = defaultMessages }: OrderCashbackProps) {
  const text = messages.cashback.order
  const rate = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(cashback.rateBps / 10_000)

  return (
    <section aria-labelledby="order-cashback-title" className="bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="order-cashback-title" className="font-semibold">
          {text.title}
        </h2>
        <span className="font-semibold tabular-nums">{money(cashback.earnedCents)}</span>
      </div>
      <p className="text-muted-foreground text-sm">{format(text.earned, { rate })}</p>
      <p className="text-sm">
        {text.statuses[cashback.status]}
        {cashback.status === "AVAILABLE" && cashback.expiresAt ? ` · ${format(text.availableUntil, { date: date(cashback.expiresAt) })}` : null}
      </p>
      {cashback.unrecoveredCents > 0 ? <p className="text-muted-foreground text-sm">{format(text.unrecovered, { amount: money(cashback.unrecoveredCents) })}</p> : null}
    </section>
  )
}
