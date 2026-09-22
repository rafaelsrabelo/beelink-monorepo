"use client"

// Libs
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

export interface TablePagerProps {
  /** 1-based, as the API counts. */
  page: number
  pageSize: number
  /** How many match the filter, across every page — never how many this page holds. */
  total: number
  onPageChange: (page: number) => void
  /** True while the next page is in flight, so a second click cannot skip one. */
  busy?: boolean
  previousLabel?: string
  nextLabel?: string
  /** Reads the range out loud: "1–20 de 137". */
  rangeLabel?: (from: number, to: number, total: number) => string
}

/**
 * How far into a list the reader is, and the two steps out of it.
 *
 * It says the range and the total rather than "page 2 of 7", because the question a shopkeeper has
 * here is how many products they have — the page number is only how they got to this screenful.
 *
 * Nothing is drawn when everything fits on one page: a pager under a list that has no second page
 * is furniture that asks to be clicked and then does nothing.
 */
export function TablePager({
  page,
  pageSize,
  total,
  onPageChange,
  busy = false,
  previousLabel = "Anterior",
  nextLabel = "Próxima",
  rangeLabel = (from, to, count) => `${from}–${to} de ${count}`,
}: TablePagerProps) {
  const pages = Math.max(Math.ceil(total / pageSize), 1)
  if (total <= pageSize) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      {/* Polite, not assertive: the count changing under a filter is worth hearing, and worth
          hearing after whatever the person is doing rather than on top of it. */}
      <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
        {rangeLabel(from, to, total)}
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || page <= 1}
          aria-label={previousLabel}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4" />
          {previousLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || page >= pages}
          aria-label={nextLabel}
          onClick={() => onPageChange(page + 1)}
        >
          {nextLabel}
          <ChevronRightIcon aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  )
}
