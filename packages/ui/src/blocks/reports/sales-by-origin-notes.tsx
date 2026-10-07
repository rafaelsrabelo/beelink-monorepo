// React
import { useId } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ExampleLink } from "./example-link"

export interface SalesByOriginNotesProps {
  /** With it, the first note says how an origin gets recorded; without, the empty state already did. */
  exampleUrl?: string
  messages?: UiMessages
}

const NOTES = ["counted", "older", "metaClicks", "meta"] as const

/**
 * What is good to know under the report (BEELINK-275): which orders count, that older ones read as
 * direct — nothing tells "came by no campaign" from "was not kept yet" — that an ad click is a
 * floor, and that ad spend and return stay at Meta.
 */
export function SalesByOriginNotes({ exampleUrl, messages = defaultMessages }: SalesByOriginNotesProps) {
  const text = messages.reports.salesByOrigin.notes
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-muted flex flex-col gap-2 rounded-lg px-3 py-3">
      <h2 id={`${id}-title`} className="text-sm font-medium">
        {text.title}
      </h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
        {exampleUrl ? (
          <li>
            {text.links} <ExampleLink url={exampleUrl} label={messages.reports.salesByOrigin.empty.exampleLabel} />
          </li>
        ) : null}
        {NOTES.map((note) => (
          <li key={note}>{text[note]}</li>
        ))}
      </ul>
    </section>
  )
}
