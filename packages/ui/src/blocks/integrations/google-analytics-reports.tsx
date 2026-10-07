// React
import { useId } from "react"

// Libs
import { ExternalLinkIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface GoogleAnalyticsReportsProps {
  /** Google Analytics itself, where the reports are. The address is the screen's to know. */
  analyticsHref: string
  messages?: UiMessages
}

/**
 * Where the shop's Google Analytics reports are (BEELINK-302): at Google, and nowhere in the panel,
 * which repeats none of those numbers. Shown with or without an ID saved, so nobody looks for them
 * here. The link leaves for another tab that cannot reach back into the panel.
 */
export function GoogleAnalyticsReports({ analyticsHref, messages = defaultMessages }: GoogleAnalyticsReportsProps) {
  const text = messages.integrations.googleAnalytics.reports
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-title`} className="font-semibold">
        {text.title}
      </h2>
      <p className="text-muted-foreground text-sm">{text.text}</p>
      <a href={analyticsHref} target="_blank" rel="noopener noreferrer" className="text-foreground inline-flex w-fit items-center gap-1 text-sm underline underline-offset-4">
        {text.link} <span className="sr-only">{text.newTab}</span>
        <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
      </a>
    </section>
  )
}
