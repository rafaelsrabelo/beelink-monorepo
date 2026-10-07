// Libs
import { ArrowRightIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink } from "../auth/auth-link"
import type { LinkComponent } from "../auth/auth-link"

export interface ReportsIndexItem {
  title: string
  /** One line: what the report answers. */
  text: string
  /** The report's page in the panel. The address is the screen's to know. */
  href: string
}

export interface ReportsIndexProps {
  /** In the order they are listed. */
  reports: readonly ReportsIndexItem[]
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The panel's reports, listed (BEELINK-276): a name, a line and the way in for each. It is the page
 * "Relatórios" lands on now that there is more than one, and the list the sales reports add theirs
 * to.
 */
export function ReportsIndex({ reports, linkComponent: Link = AnchorLink, messages = defaultMessages }: ReportsIndexProps) {
  return (
    <ul aria-label={messages.reports.index.listLabel} className="grid gap-4 sm:grid-cols-2">
      {reports.map((report) => (
        <li key={report.href} className="bg-shell-surface border-shell-border hover:border-foreground/30 focus-within:ring-ring relative flex flex-col gap-2 rounded-xl border p-4 shadow-xs focus-within:ring-2 sm:p-6">
          <h2 className="font-semibold">
            {/* The whole card is the link's target; its name is the link's name. */}
            <Link href={report.href} className="inline-flex items-center gap-1 outline-none after:absolute after:inset-0 after:content-['']">
              {report.title}
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </h2>
          <p className="text-muted-foreground text-sm">{report.text}</p>
        </li>
      ))}
    </ul>
  )
}
