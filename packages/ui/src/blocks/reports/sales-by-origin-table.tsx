// UI
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@harness-monorepo/ui/components/table"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { SalesByOriginRowView, SalesTotalsView } from "./report-types"
import { revenueShareOf, salesOriginLabelOf } from "./sales-origin-label"

export interface SalesByOriginTableProps {
  /** In the order they are drawn: the API sends the highest revenue first. */
  rows: readonly SalesByOriginRowView[]
  totals: SalesTotalsView
  /** The table's caption, read to a screen reader: which period these numbers are of. */
  caption: string
  locale?: string
  messages?: UiMessages
}

/**
 * A period's sales by where their buyers came from (BEELINK-275): one line per origin, and the
 * period's total under them.
 *
 * One table at every width, with no sideways scroll: the origin's cell is the one that gives, its
 * text wrapping inside it, and the three numbers keep their line. A campaign's name came from a link
 * anyone may write — it is drawn as text, held to two lines, with the whole of it in `title`.
 */
export function SalesByOriginTable({ rows, totals, caption, locale = defaultLocale, messages = defaultMessages }: SalesByOriginTableProps) {
  const text = messages.reports.salesByOrigin
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" })
  const count = new Intl.NumberFormat(locale)
  const numeric = "w-px px-2 text-right tabular-nums sm:px-4"

  return (
    <div className="bg-shell-surface border-shell-border rounded-xl border shadow-xs">
      <Table className="table-auto">
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="px-3 sm:px-4">{text.columns.origin}</TableHead>
            <TableHead className={numeric}>{text.columns.orders}</TableHead>
            <TableHead className={numeric}>{text.columns.revenue}</TableHead>
            <TableHead className={`${numeric} whitespace-normal sm:whitespace-nowrap`}>{text.columns.share}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const label = salesOriginLabelOf(row, messages)

            return (
              <TableRow key={`${row.kind}|${row.source ?? ""}|${row.medium ?? ""}|${row.campaign ?? ""}`}>
                <TableHead scope="row" className="h-auto max-w-0 px-3 py-2 font-normal whitespace-normal sm:px-4">
                  <span className="line-clamp-2 font-medium break-words" title={label.line}>
                    {label.line}
                  </span>
                  {label.detail ? <span className="text-muted-foreground block text-xs">{label.detail}</span> : null}
                </TableHead>
                <TableCell className={numeric}>{count.format(row.orders)}</TableCell>
                <TableCell className={`${numeric} font-medium`}>{money.format(row.revenueCents / 100)}</TableCell>
                <TableCell className={`${numeric} text-muted-foreground`}>{revenueShareOf(row.revenueCents, totals.revenueCents, locale) ?? text.noShare}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableHead scope="row" className="px-3 sm:px-4">
              {text.total}
            </TableHead>
            <TableCell className={numeric}>{count.format(totals.orders)}</TableCell>
            <TableCell className={numeric}>{money.format(totals.revenueCents / 100)}</TableCell>
            <TableCell className={numeric}>{revenueShareOf(totals.revenueCents, totals.revenueCents, locale) ?? text.noShare}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
