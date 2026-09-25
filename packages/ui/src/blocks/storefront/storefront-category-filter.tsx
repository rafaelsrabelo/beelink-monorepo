// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontFilterSection } from "./storefront-filter-section"

export interface StorefrontCategoryFilterEntry {
  slug: string
  label: string
  href: string
  count: number
  /** The one the shelf is narrowed to: drawn bold, and its link takes the narrowing off. */
  selected?: boolean
}

export interface StorefrontCategoryFilterProps {
  /** "‹ Todos os produtos" from a category, "‹ Proteínas" from a subcategory. */
  back?: { label: string; href: string }
  /** The category whose page this is, bold and not a link. */
  current?: string
  /** What the shelf can be narrowed to from here, each with its count. */
  entries: readonly StorefrontCategoryFilterEntry[]
  locale: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The column's "Categoria" group, as 5a draws it on each kind of page: the top level with counts on
 * the catalogue and a search; on a category, the way back, the category and its children indented.
 */
export function StorefrontCategoryFilter({
  back,
  current,
  entries,
  locale,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCategoryFilterProps) {
  const number = new Intl.NumberFormat(locale)

  if (!back && !current && !entries.length) return null

  return (
    <StorefrontFilterSection title={messages.storefront.filterCategory}>
      {back ? (
        <Link href={back.href} className="text-sm hover:underline">
          ‹ {back.label}
        </Link>
      ) : null}
      {current ? <span className="pl-2.5 text-sm font-bold">{current}</span> : null}
      {entries.length ? (
        <ul className={cn("flex flex-col gap-1.5 text-sm", current && "pl-5")}>
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link href={entry.href} aria-current={entry.selected ? "true" : undefined} className={cn("hover:underline", entry.selected && "font-bold")}>
                {entry.label} <span className="text-shop-muted">({number.format(entry.count)})</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </StorefrontFilterSection>
  )
}
