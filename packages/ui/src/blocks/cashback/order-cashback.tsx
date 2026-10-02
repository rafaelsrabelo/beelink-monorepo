// React
import { useId } from "react"

// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ratePercentOf, type OrderCashbackView } from "@harness-monorepo/ui/lib/cashback"

export interface OrderCashbackProps {
  cashback: OrderCashbackView
  money: (cents: number) => string
  /** "30 de out. de 2026", in the shop's own words for a day. */
  date: (iso: string) => string
  /** What "already expired" is read against. */
  now?: Date
  locale?: string
  messages?: UiMessages
}

/**
 * What an order earns in cashback and where that credit stands (BEELINK-242), on the order's page:
 * pending until it is delivered, then usable until a day — what is left of it once the customer spent
 * part — or expired, or taken back. When it was taken back after
 * the customer had spent part of it, the part the balance did not get back is said — the shop's to
 * settle with the customer, since the balance never goes below zero.
 */
export function OrderCashback({ cashback, money, date, now = new Date(), locale = defaultLocale, messages = defaultMessages }: OrderCashbackProps) {
  const text = messages.cashback.order
  const titleId = useId()
  // A lot past its expiry stays AVAILABLE until the API's sweep takes it: it reads as what it is.
  const expired = cashback.status === "EXPIRED" || (cashback.status === "AVAILABLE" && cashback.expiresAt !== null && new Date(cashback.expiresAt) <= now)
  const usable = cashback.status === "AVAILABLE" && !expired
  const rate = ratePercentOf(cashback.rateBps, locale)

  return (
    <section aria-labelledby={titleId} className="bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={titleId} className="font-semibold">
          {text.title}
        </h2>
        <span className="font-semibold tabular-nums">{money(cashback.earnedCents)}</span>
      </div>
      <p className="text-muted-foreground text-sm">{format(text.earned, { rate })}</p>
      <p className="text-sm">
        {text.statuses[expired ? "EXPIRED" : cashback.status]}
        {usable && cashback.remainingCents > 0 && cashback.expiresAt ? ` · ${format(text.availableUntil, { date: date(cashback.expiresAt) })}` : null}
      </p>
      {usable && cashback.remainingCents === 0 ? <p className="text-muted-foreground text-sm">{text.spent}</p> : null}
      {usable && cashback.remainingCents > 0 && cashback.remainingCents < cashback.earnedCents - cashback.unrecoveredCents ? (
        <p className="text-muted-foreground text-sm">{format(text.left, { amount: money(cashback.remainingCents) })}</p>
      ) : null}
      {cashback.unrecoveredCents > 0 ? <p className="text-muted-foreground text-sm">{format(text.unrecovered, { amount: money(cashback.unrecoveredCents) })}</p> : null}
    </section>
  )
}
