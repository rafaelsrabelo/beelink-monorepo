// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePayoutRowView } from "@harness-monorepo/ui/lib/affiliates"

export interface AffiliatePayoutCalendarProps {
  /** The month's three periods, as the screen worked them out at the delay typed. Empty while the delay does not hold. */
  rows: readonly AffiliatePayoutRowView[]
  messages?: UiMessages
}

/** The month's payout calendar (IMPULSEIA-102): what is delivered in each period, and the day it is paid. */
export function AffiliatePayoutCalendar({ rows, messages = defaultMessages }: AffiliatePayoutCalendarProps) {
  const text = messages.affiliates.settings

  return (
    <section aria-label={text.calendar} className="bg-muted flex flex-col gap-2 rounded-lg px-3 py-3 text-sm">
      <h3 className="font-medium">{text.calendar}</h3>
      {rows.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.from} className="tabular-nums">
              {format(text.calendarRow, { from: row.from, to: row.to, due: row.due })}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-muted-foreground">{text.calendarHelp}</p>
    </section>
  )
}
