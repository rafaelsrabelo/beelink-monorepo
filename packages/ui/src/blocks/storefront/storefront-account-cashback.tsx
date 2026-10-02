// React
import { useId, type ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** A lot still worth something, in words. */
export interface StorefrontAccountCashbackCredit {
  key: string
  /** "Pedido nº 12", or "Crédito da loja". */
  origin: string
  /** What is left of it, in money. */
  amount: string
  /** "Restam R$ 3,00 de R$ 5,00" once partly spent; null while whole. */
  left: string | null
  /** "Vence em 10/11/2026", "Não vence", or that it waits on its order's delivery. */
  when: string
}

/** A line of the statement, in words. */
export interface StorefrontAccountCashbackEntry {
  key: string
  /** What happened: "Ganho", "Usado"… */
  label: string
  /** "Pedido nº 12", or null. */
  detail: string | null
  /** Signed, in money: "+ R$ 5,00", "− R$ 3,00". */
  amount: string
  /** It added to the balance. */
  positive: boolean
  date: string
}

export interface StorefrontAccountCashbackProps {
  balance: string
  /** Null with nothing waiting on a delivery. */
  pending: string | null
  /** The soonest part of the balance to expire, or that none does; null with no balance. */
  expiry: string | null
  /** The shop's rule while its cashback is on, in a sentence; null while it is off. */
  rule: string | null
  credits: readonly StorefrontAccountCashbackCredit[]
  /** One page of the statement, the newest first. */
  entries: readonly StorefrontAccountCashbackEntry[]
  /** The statement's pages, drawn by the screen: a block never knows how a page is spelled. */
  pagination?: ReactNode
  messages?: UiMessages
}

const CARD = "flex flex-col gap-1 rounded-xl border border-shop-line p-4"

/**
 * The account's cashback tab (BEELINK-244): what the shopper can spend, what waits on a delivery and
 * what expires first; the credits it is made of, the soonest to expire first; and the statement.
 */
export function StorefrontAccountCashback({ balance, pending, expiry, rule, credits, entries, pagination, messages = defaultMessages }: StorefrontAccountCashbackProps) {
  const text = messages.storefront.accountCashbackTab
  const id = useId()

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={CARD}>
          <p className="text-sm text-shop-muted">{text.balance}</p>
          <p className="text-2xl font-bold tabular-nums">{balance}</p>
          {expiry ? <p className="text-sm text-shop-muted">{expiry}</p> : null}
        </div>
        {pending ? (
          <div className={CARD}>
            <p className="text-sm text-shop-muted">{text.pending}</p>
            <p className="text-2xl font-bold tabular-nums">{pending}</p>
            <p className="text-sm text-shop-muted">{text.pendingHint}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 text-sm">
        {rule ? <p>{rule}</p> : null}
        <p className="text-shop-muted">{text.howToUse}</p>
      </div>

      {credits.length ? (
        <section aria-labelledby={`${id}-credits`} className="flex flex-col gap-2">
          <h2 id={`${id}-credits`} className="text-base font-bold">
            {text.credits}
          </h2>
          <ul className="flex flex-col divide-y divide-shop-line">
            {credits.map((credit) => (
              <li key={credit.key} className="flex items-start justify-between gap-3 py-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{credit.origin}</span>
                  <span className="text-xs text-shop-muted">{credit.when}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-sm font-bold tabular-nums">{credit.amount}</span>
                  {credit.left ? <span className="text-xs text-shop-muted">{credit.left}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby={`${id}-statement`} className="flex flex-col gap-2">
        <h2 id={`${id}-statement`} className="text-base font-bold">
          {text.statement}
        </h2>
        {entries.length ? (
          <ul className="flex flex-col divide-y divide-shop-line">
            {entries.map((entry) => (
              <li key={entry.key} className="flex items-start justify-between gap-3 py-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{entry.label}</span>
                  <span className="text-xs text-shop-muted">{entry.detail ? `${entry.detail} · ${entry.date}` : entry.date}</span>
                </span>
                <span className={cn("shrink-0 text-sm font-bold tabular-nums", entry.positive && "text-shop-positive-ink")}>{entry.amount}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-shop-muted">{credits.length ? text.emptyStatement : text.empty}</p>
        )}
        {pagination}
      </section>
    </div>
  )
}
