// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateStatementRowView } from "@harness-monorepo/ui/lib/affiliate-money"

export interface AffiliateStatementProps {
  rows: readonly AffiliateStatementRowView[]
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
  messages?: UiMessages
}

/** An affiliate's statement (IMPULSEIA-107), newest first: each line and what it moved. A line is never edited. */
export function AffiliateStatement({ rows, page, pageSize, total, onPage, messages = defaultMessages }: AffiliateStatementProps) {
  const text = messages.affiliates.money
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <h3 className="font-medium">{text.statement}</h3>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.empty}</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-4 py-2.5">
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{row.kind}</span>
                <span className="text-muted-foreground text-xs">
                  {row.date}
                  {row.detail ? ` · ${row.detail}` : ""}
                </span>
              </div>
              <span className={cn("shrink-0 text-sm font-medium tabular-nums", row.negative ? "text-destructive" : "")}>{row.amount}</span>
            </li>
          ))}
        </ul>
      )}
      {total > pageSize ? (
        <nav aria-label={text.statement} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{format(text.range, { from: String(from), to: String(to), total: String(total) })}</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
              {text.previous}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={to >= total} onClick={() => onPage(page + 1)}>
              {text.next}
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  )
}
