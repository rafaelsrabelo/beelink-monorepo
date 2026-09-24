// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontFilterChips, type StorefrontFilterChip } from "./storefront-filter-chips"

export type { StorefrontFilterChip }

export interface StorefrontFilterColumnProps {
  /** The filters in force, each a way to take it off. The route's own category is never one. */
  chips?: readonly StorefrontFilterChip[]
  /** The shelf with no filter at all. Drawn only while a chip is. */
  clearHref?: string
  /** The groups: `StorefrontFilterSection`s, each drawn only when it has something to offer. */
  children?: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * 5a's filter column: 264px beside the grid, "Filtros" over the removable chips of what is in force,
 * then one group per facet. Every control is a link to an address — the address is the filter —
 * so it works with scripting off, and a crawler sees each narrowing as the page it is.
 *
 * It is the desktop's; below `shop-lg` the page gives the same groups another door (B8).
 */
export function StorefrontFilterColumn({
  chips = [],
  clearHref,
  children,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontFilterColumnProps) {
  const text = messages.storefront

  return (
    <aside aria-label={text.filtersTitle} className="hidden w-66 shrink-0 flex-col text-shop-on-background shop-lg:flex">
      <div className="flex items-center justify-between pb-3.5">
        <h2 className="text-lg font-extrabold">{text.filtersTitle}</h2>
        {chips.length && clearHref ? (
          <Link href={clearHref} className="text-[13px] font-semibold text-shop-primary-ink hover:underline">
            {text.filtersClear}
          </Link>
        ) : null}
      </div>

      {chips.length ? <StorefrontFilterChips chips={chips} linkComponent={Link} messages={messages} className="border-b border-shop-line pb-4" /> : null}

      {children}
    </aside>
  )
}
