// React
import type { ReactNode } from "react"

// Libs
import { XIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontFilterChip {
  label: string
  /** The same shelf without this one filter. */
  href: string
}

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

      {chips.length ? (
        <ul className="flex flex-wrap gap-1.5 border-b border-shop-line pb-4">
          {chips.map((chip) => (
            <li key={chip.href}>
              <Link
                href={chip.href}
                aria-label={format(text.filterRemove, { label: chip.label })}
                className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--shop-primary)_40%,transparent)] bg-[color-mix(in_oklab,var(--shop-primary)_6%,transparent)] px-2.5 text-xs font-semibold text-shop-primary-ink"
              >
                {chip.label}
                <XIcon aria-hidden="true" className="size-3" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {children}
    </aside>
  )
}
