// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AFFILIATE_RECORD_TABS, type AffiliateRecordTab } from "@harness-monorepo/ui/lib/affiliates"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AffiliateRecordTabsProps {
  active: AffiliateRecordTab
  hrefOf: (tab: AffiliateRecordTab) => string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const LABEL = { geral: "general", comissao: "commission", documento: "document", financeiro: "money", pedidos: "orders" } as const satisfies Record<AffiliateRecordTab, keyof UiMessages["affiliates"]["record"]["tabs"]>

/**
 * The sections of an affiliate's record (12/11/2026), as links: each is an address, so a reload or
 * the back button keeps it. On a phone the row scrolls sideways rather than wrapping.
 */
export function AffiliateRecordTabs({ active, hrefOf, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateRecordTabsProps) {
  const text = messages.affiliates.record.tabs

  return (
    <nav aria-label={text.label} className="border-shell-border -mx-4 overflow-x-auto border-b px-4 lg:mx-0 lg:px-0">
      <div className="flex w-max gap-1">
        {AFFILIATE_RECORD_TABS.map((tab) => (
          <Link
            key={tab}
            href={hrefOf(tab)}
            aria-current={active === tab ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring -mb-px rounded-t-md border-b-2 px-3 pb-2.5 pt-1.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2",
              active === tab ? "border-primary text-foreground" : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {text[LABEL[tab]]}
          </Link>
        ))}
      </div>
    </nav>
  )
}
