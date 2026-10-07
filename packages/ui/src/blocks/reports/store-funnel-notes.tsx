// React
import { useId } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StoreFunnelNotesProps {
  /** For how many months a day's numbers are kept. The API says. */
  retentionMonths: number
  messages?: UiMessages
}

const NOTES = ["events", "above", "purchases", "anonymous", "owner", "since"] as const

/**
 * What is good to know under the funnel (BEELINK-276), and what keeps it honest: the steps count
 * events and not people, a step can outgrow the one before, the purchases are the shop's real
 * orders, nothing identifies a visitor, the shopkeeper's own visits are left out, earlier days read
 * as zero, and for how long a day is kept.
 */
export function StoreFunnelNotes({ retentionMonths, messages = defaultMessages }: StoreFunnelNotesProps) {
  const text = messages.reports.funnel.notes
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-muted flex flex-col gap-2 rounded-lg px-3 py-3">
      <h2 id={`${id}-title`} className="text-sm font-medium">
        {text.title}
      </h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
        {NOTES.map((note) => (
          <li key={note}>{text[note]}</li>
        ))}
        <li>{format(text.retention, { months: String(retentionMonths) })}</li>
      </ul>
    </section>
  )
}
