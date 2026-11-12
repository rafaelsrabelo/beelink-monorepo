// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/** The sections of one shop's page, in the address (`?aba=`). */
export type AffiliateAreaTab = "home" | "products" | "orders" | "statement" | "profile"

export interface AffiliateAreaTabsProps {
  active: AffiliateAreaTab
  /** The sections offered: an ended standing has no links to share. */
  tabs: readonly AffiliateAreaTab[]
  hrefOf: (tab: AffiliateAreaTab) => string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The sections of the affiliate's page at a shop (IMPULSEIA-108), as links: each one is an address. */
export function AffiliateAreaTabs({ active, tabs, hrefOf, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateAreaTabsProps) {
  const text = messages.affiliateArea.tabs

  return (
    <nav aria-label={text.label} className="border-shell-border -mx-4 overflow-x-auto border-b px-4">
      <ul className="flex gap-1">
        {tabs.map((tab) => (
          <li key={tab}>
            <Link
              href={hrefOf(tab)}
              aria-current={tab === active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm whitespace-nowrap",
                tab === active ? "border-primary text-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {text[tab]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
