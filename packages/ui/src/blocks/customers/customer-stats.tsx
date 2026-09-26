// React
import { useId } from "react"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { formatCents } from "../storefront/storefront-price"
import type { CustomerRecordView } from "./customer-types"

export interface CustomerStatsProps {
  customer: Pick<CustomerRecordView, "ordersCount" | "totalSpentCents" | "averageTicketCents" | "firstOrderAt" | "lastOrderAt" | "daysSinceLastOrder">
  locale?: string
  currency?: string
  messages?: UiMessages
}

/** What nothing is: no average, no first order — a dash, never a zero that reads like a figure. */
const NONE = "—"

/**
 * A customer's figures, every one the API's and over the valid orders: how many, how much, how
 * much each on average, the first and the latest, and for how long they have not bought. Nothing
 * is recounted here, so the record, the list and the stage never disagree.
 */
export function CustomerStats({ customer, locale = defaultLocale, currency = "BRL", messages = defaultMessages }: CustomerStatsProps) {
  const text = messages.customers.record
  const titleId = useId()
  const money = (cents: number) => formatCents(cents, locale, currency)
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" })
  const when = (iso: string | null) => (iso ? date.format(new Date(iso)) : NONE)

  const figures: readonly (readonly [string, string])[] = [
    [text.orders, String(customer.ordersCount)],
    [text.spent, money(customer.totalSpentCents)],
    [text.averageTicket, customer.averageTicketCents === null ? NONE : money(customer.averageTicketCents)],
    [text.firstOrder, when(customer.firstOrderAt)],
    [text.lastOrder, when(customer.lastOrderAt)],
    [text.daysSince, customer.daysSinceLastOrder === null ? NONE : String(customer.daysSinceLastOrder)],
  ]

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="font-semibold">
        {text.numbers}
      </h2>
      <dl className="grid grid-cols-2 gap-3 @2xl/main:grid-cols-3 @6xl/main:grid-cols-6">
        {figures.map(([label, value]) => (
          <div key={label} className="bg-shell-surface border-shell-border flex flex-col gap-1 rounded-xl border p-4 shadow-xs">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
