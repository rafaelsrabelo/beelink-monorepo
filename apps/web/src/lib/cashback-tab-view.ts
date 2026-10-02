// Types
import type { PublicCashback, ShopperCashback } from "@harness-monorepo/contracts"
import type { StorefrontAccountCashbackProps } from "@harness-monorepo/ui/blocks/storefront/storefront-account-cashback"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { pageOf } from "./storefront-routes"

/** The API's own last page: an address pasted with one beyond it is cut to it rather than refused. */
export const CASHBACK_PAGE_MAX = 10_000

/** The page of the statement an address asks for. */
export function cashbackPageOf(raw: string | string[] | undefined): number {
  return Math.min(pageOf(raw), CASHBACK_PAGE_MAX)
}

export interface CashbackTabContext {
  locale: string
  messages: UiMessages
}

/** A day as the shop's country reads it: a credit that expires "em 10/11" does so by the shop's clock, not the server's. */
function dayOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
}

/**
 * The account's cashback tab in words (BEELINK-244), from the shopper's own read of it. `rule` is the
 * shop's cashback while it is on: a shopper keeps what they were given after the shop switches it
 * off, and then the tab says the balance without a rule.
 */
export function cashbackTabViewOf(cashback: ShopperCashback, rule: PublicCashback | null, { locale, messages }: CashbackTabContext): Omit<StorefrontAccountCashbackProps, "pagination" | "messages"> {
  const text = messages.storefront.accountCashbackTab
  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const originOf = (orderNumber: number | null) => (orderNumber === null ? null : format(text.order, { number: String(orderNumber) }))

  return {
    balance: money(cashback.balanceCents),
    pending: cashback.pendingCents > 0 ? money(cashback.pendingCents) : null,
    expiry:
      cashback.balanceCents <= 0
        ? null
        : cashback.nextExpiry
          ? format(text.nextExpiry, { amount: money(cashback.nextExpiry.amountCents), date: dayOf(cashback.nextExpiry.expiresAt, locale) })
          : text.noExpiry,
    rule: rule
      ? rule.minSubtotalCents > 0
        ? format(text.earnsFrom, { rate: ratePercentOf(rule.rateBps, locale), minimum: money(rule.minSubtotalCents) })
        : format(text.earns, { rate: ratePercentOf(rule.rateBps, locale) })
      : null,
    credits: cashback.credits.map((credit) => ({
      key: credit.id,
      origin: originOf(credit.orderNumber) ?? text.shopCredit,
      amount: money(credit.remainingCents),
      left: credit.remainingCents < credit.amountCents ? format(text.left, { left: money(credit.remainingCents), amount: money(credit.amountCents) }) : null,
      when: credit.status === "PENDING" ? text.waitsDelivery : credit.expiresAt ? format(text.expiresOn, { date: dayOf(credit.expiresAt, locale) }) : text.neverExpires,
    })),
    entries: cashback.entries.map((entry) => ({
      key: entry.id,
      label: text.kinds[entry.kind],
      detail: originOf(entry.orderNumber),
      amount: `${entry.amountCents > 0 ? "+" : "−"} ${money(Math.abs(entry.amountCents))}`,
      positive: entry.amountCents > 0,
      date: dayOf(entry.createdAt, locale),
    })),
  }
}
