// React
import { useId } from "react"

// Libs
import { ExternalLinkIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface MetaPixelGuideProps {
  /** Meta's Events Manager, where the ID is copied from. The address is the screen's to know. */
  eventsManagerHref: string
  messages?: UiMessages
}

const STEPS = ["open", "sources", "pick", "copy"] as const
const NOTES = ["domain", "reports", "unchecked", "consent"] as const

/**
 * Where a shopkeeper finds their pixel's ID at Meta (BEELINK-270), step by step, and what is good to
 * know before pasting it: the domain needs no verifying there (BEELINK-268 — shops share one, and
 * none could verify it), reports and ads stay at Meta, nobody checks the ID against Meta, and a visitor
 * is asked before anything of theirs reaches Meta (BEELINK-271).
 *
 * Under the card whether an ID is saved or not: whoever changes one needs it as much as whoever
 * gives the first. The link leaves for another tab that cannot reach back into the panel.
 */
export function MetaPixelGuide({ eventsManagerHref, messages = defaultMessages }: MetaPixelGuideProps) {
  const text = messages.integrations.metaPixel.guide
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-title`} className="font-semibold">
        {text.title}
      </h2>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
        {STEPS.map((step) => (
          <li key={step}>{text.steps[step]}</li>
        ))}
      </ol>
      <a href={eventsManagerHref} target="_blank" rel="noopener noreferrer" className="text-foreground inline-flex w-fit items-center gap-1 text-sm underline underline-offset-4">
        {text.openLink} <span className="sr-only">{text.newTab}</span>
        <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
      </a>

      <div className="bg-muted flex flex-col gap-2 rounded-lg px-3 py-3">
        <h3 className="text-sm font-medium">{text.notesTitle}</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
          {NOTES.map((note) => (
            <li key={note}>{text.notes[note]}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
