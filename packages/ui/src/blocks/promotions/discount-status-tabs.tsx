// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface DiscountStatusTab {
  key: string
  label: string
  /** Absent while the list is read: a zero beside the skeleton would be a false count. */
  count?: number
  href: string
  active: boolean
}

export interface DiscountStatusTabsProps {
  tabs: readonly DiscountStatusTab[]
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The promotions or the coupons narrowed by where each stands, with how many each status holds.
 * Links, so the status chosen is an address — shared, reloaded or gone back to.
 */
export function DiscountStatusTabs({ tabs, linkComponent: Link = AnchorLink, messages = defaultMessages }: DiscountStatusTabsProps) {
  return (
    <nav aria-label={messages.discounts.statusLabel} className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.active ? "true" : undefined}
          className={cn("inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm", tab.active ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <>
              {" "}
              <span className="tabular-nums opacity-70">({tab.count})</span>
            </>
          ) : null}
        </Link>
      ))}
    </nav>
  )
}
