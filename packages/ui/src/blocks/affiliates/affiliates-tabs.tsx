// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AffiliatesTabsProps {
  active: "affiliates" | "applications" | "owed" | "settings" | "tables"
  affiliatesHref: string
  /** The applications the shop's page took (plan 2026-11-14). */
  applicationsHref: string
  /** Applications waiting: said beside the tab while there are any. */
  pendingApplications?: number
  /** What the shop owes, by due day (IMPULSEIA-107). */
  owedHref: string
  settingsHref: string
  tablesHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The affiliate screens' sections (IMPULSEIA-102, the list since IMPULSEIA-104, what is owed since
 * IMPULSEIA-107, the applications since 14/11/2026), as links: each is a
 * place with an address, so a reload or a shared link opens the same section.
 */
export function AffiliatesTabs({ active, affiliatesHref, applicationsHref, pendingApplications = 0, owedHref, settingsHref, tablesHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliatesTabsProps) {
  const text = messages.affiliates.tabs
  const tab = (key: AffiliatesTabsProps["active"], href: string, label: string, count = 0) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
        active === key ? "border-primary text-foreground" : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {label}
      {/* The space is the name's: without it a screen reader reads "Candidaturas1". */}
      {count > 0 ? (
        <>
          {" "}
          <span className="bg-primary text-primary-foreground ms-1 rounded-full px-1.5 py-0.5 text-xs">{count}</span>
        </>
      ) : null}
    </Link>
  )

  return (
    <nav aria-label={text.label} className="flex gap-6 overflow-x-auto border-b">
      {tab("affiliates", affiliatesHref, text.affiliates)}
      {tab("applications", applicationsHref, text.applications, pendingApplications)}
      {tab("owed", owedHref, text.owed)}
      {tab("settings", settingsHref, text.settings)}
      {tab("tables", tablesHref, text.tables)}
    </nav>
  )
}
