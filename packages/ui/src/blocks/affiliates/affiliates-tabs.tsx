// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AffiliatesTabsProps {
  active: "affiliates" | "owed" | "settings" | "tables"
  affiliatesHref: string
  /** What the shop owes, by due day (IMPULSEIA-107). */
  owedHref: string
  settingsHref: string
  tablesHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The affiliate screens' sections (IMPULSEIA-102, the list since IMPULSEIA-104, what is owed since
 * IMPULSEIA-107), as links: each is a
 * place with an address, so a reload or a shared link opens the same section.
 */
export function AffiliatesTabs({ active, affiliatesHref, owedHref, settingsHref, tablesHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliatesTabsProps) {
  const text = messages.affiliates.tabs
  const tab = (key: AffiliatesTabsProps["active"], href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
        active === key ? "border-primary text-foreground" : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {label}
    </Link>
  )

  return (
    <nav aria-label={text.label} className="flex gap-6 border-b">
      {tab("affiliates", affiliatesHref, text.affiliates)}
      {tab("owed", owedHref, text.owed)}
      {tab("settings", settingsHref, text.settings)}
      {tab("tables", tablesHref, text.tables)}
    </nav>
  )
}
