// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { SalesByOriginRowsProps } from "./report-types"
import { revenueShareOf, salesOriginLabelOf } from "./sales-origin-label"

interface FiguresProps {
  orders: string
  revenue: string
  share: string
  labels: UiMessages["reports"]["salesByOrigin"]["columns"]
}

/** The three numbers of a line, each under its name: on a card there is no header row to name them. */
function Figures({ orders, revenue, share, labels }: FiguresProps) {
  const figures = [
    [labels.orders, orders],
    [labels.revenue, revenue],
    [labels.share, share],
  ] as const

  return (
    <dl className="grid grid-cols-3 gap-2 text-sm">
      {figures.map(([name, value], at) => (
        <div key={name} className={at === 0 ? "flex flex-col" : at === 1 ? "flex flex-col items-center" : "flex flex-col items-end"}>
          <dt className="text-muted-foreground text-xs">{name}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The same lines where a table has no room (BEELINK-275): one card per origin, its name across the
 * whole width and its three numbers under it, and the period's total last. A name is text and is
 * drawn whole, breaking anywhere: a finger has no `title` to hover for the rest of it.
 */
export function SalesByOriginCards({ rows, totals, caption, locale = defaultLocale, messages = defaultMessages }: SalesByOriginRowsProps) {
  const text = messages.reports.salesByOrigin
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" })
  const count = new Intl.NumberFormat(locale)
  const card = "bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-3 shadow-xs"

  return (
    <ul aria-label={caption} className="flex flex-col gap-2">
      {rows.map((row) => {
        const label = salesOriginLabelOf(row, messages)

        return (
          <li key={`${row.kind}|${row.source ?? ""}|${row.medium ?? ""}|${row.campaign ?? ""}`} className={card}>
            <div className="min-w-0">
              <p className="font-medium break-words">
                {label.line}
              </p>
              {label.detail ? <p className="text-muted-foreground text-xs">{label.detail}</p> : null}
            </div>
            <Figures orders={count.format(row.orders)} revenue={money.format(row.revenueCents / 100)} share={revenueShareOf(row.revenueCents, totals.revenueCents, locale) ?? text.noShare} labels={text.columns} />
          </li>
        )
      })}
      <li className={`${card} bg-muted/50`}>
        <p className="font-medium">{text.total}</p>
        <Figures orders={count.format(totals.orders)} revenue={money.format(totals.revenueCents / 100)} share={revenueShareOf(totals.revenueCents, totals.revenueCents, locale) ?? text.noShare} labels={text.columns} />
      </li>
    </ul>
  )
}
