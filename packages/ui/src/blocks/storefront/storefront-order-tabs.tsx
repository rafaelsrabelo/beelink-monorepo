// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontOrderTab {
  label: string
  count: number
  href: string
  current: boolean
}

export interface StorefrontOrderTabsProps {
  tabs: readonly StorefrontOrderTab[]
  /** What the row is called to a reader: Meus pedidos' by default, and Favoritos' filters (6g) say theirs. */
  label?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Todos · Em andamento · Entregues · Cancelados, each with how many it holds. Links, not tabs: each
 * one is an address of its own, which the back button and a shared link both respect.
 */
export function StorefrontOrderTabs({ tabs, label, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrderTabsProps) {
  const text = messages.storefront

  return (
    <nav aria-label={label ?? text.ordersFilterLabel} className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.current ? "page" : undefined}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm",
            tab.current ? "border-2 border-shop-primary bg-shop-primary-tint font-bold text-shop-primary-ink" : "border-shop-line-strong bg-shop-background",
          )}
        >
          {tab.label}
          <span className="tabular-nums opacity-80">({tab.count})</span>
        </Link>
      ))}
    </nav>
  )
}
