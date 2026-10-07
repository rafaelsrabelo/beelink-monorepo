// Libs
import { funnelRowsOf, per100Text } from "@harness-monorepo/ui/lib/funnel-view"
import type { FunnelStepView } from "@harness-monorepo/ui/lib/funnel-view"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StoreFunnelListProps {
  /** The five steps, in the funnel's order. */
  steps: readonly FunnelStepView[]
  /** Which period these numbers are of, for a screen reader: the list's name. */
  caption: string
  locale?: string
  messages?: UiMessages
}

/**
 * The shop's funnel (BEELINK-276): its steps in order, each with how many times it happened, how
 * many that is for every hundred of the step before, and how many were lost on the way.
 *
 * An ordered list, because the order is the meaning. Every number is text; the bar under a step is
 * decoration, hidden from a screen reader, measured against the largest step. Stacked at every
 * width, so nothing here needs a second layout for a phone.
 */
export function StoreFunnelList({ steps, caption, locale = "pt-BR", messages = defaultMessages }: StoreFunnelListProps) {
  const text = messages.reports.funnel
  const count = new Intl.NumberFormat(locale)

  return (
    <ol aria-label={caption} className="bg-shell-surface border-shell-border flex flex-col rounded-xl border shadow-xs">
      {funnelRowsOf(steps).map((row, at) => (
        <li key={row.step} className="flex flex-col gap-2 border-b px-4 py-4 last:border-b-0 sm:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 font-medium">
              <span className="text-muted-foreground tabular-nums">{at + 1}. </span>
              {text.steps[row.step]}
            </p>
            <p className="text-xl font-semibold tabular-nums">{count.format(row.count)}</p>
          </div>
          <div aria-hidden="true" data-testid="funnel-bar" className="bg-muted h-2 overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full" style={{ width: `${Math.round(row.share * 1000) / 10}%` }} />
          </div>
          <p className="text-muted-foreground text-sm">{text.stepHints[row.step]}</p>
          {row.step !== "PAGE_VIEW" && row.per100 !== null ? <p className="text-sm">{format(text.rates[row.step], { count: per100Text(row.per100, locale) })}</p> : null}
          {row.drop !== null ? <p className="text-muted-foreground text-sm">{format(text.drop, { count: count.format(row.drop) })}</p> : null}
        </li>
      ))}
    </ol>
  )
}
