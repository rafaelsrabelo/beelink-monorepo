// UI
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@harness-monorepo/ui/components/table"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"

// Block
import type { SalesByOriginRowsProps } from "./report-types"
import { revenueShareOf, salesOriginLabelOf } from "./sales-origin-label"

/**
 * A period's sales by where their buyers came from (BEELINK-275), where there is room for a table:
 * one line per origin, and the period's total under them.
 *
 * The origin's cell is the one that gives, its text wrapping inside it; the three numbers keep their
 * line. A campaign's name came from a link anyone may write — it is drawn as text, held to two
 * lines, with the whole of it in `title`.
 */
export function SalesByOriginTable({ rows, totals, caption, locale = defaultLocale, messages = defaultMessages }: SalesByOriginRowsProps) {
  const text = messages.reports.salesByOrigin
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" })
  const count = new Intl.NumberFormat(locale)
  const numeric = "w-px px-4 text-right tabular-nums"

  return (
    <div className="bg-shell-surface border-shell-border rounded-xl border shadow-xs">
      <Table className="table-auto">
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="px-4">{text.columns.origin}</TableHead>
            <TableHead className={numeric}>{text.columns.orders}</TableHead>
            <TableHead className={numeric}>{text.columns.revenue}</TableHead>
            <TableHead className={numeric}>{text.columns.share}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const label = salesOriginLabelOf(row, messages)

            return (
              <TableRow key={`${row.kind}|${row.source ?? ""}|${row.medium ?? ""}|${row.campaign ?? ""}`}>
                <TableHead scope="row" className="h-auto max-w-0 px-4 py-2 font-normal whitespace-normal">
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
            <TableHead scope="row" className="px-4">
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
