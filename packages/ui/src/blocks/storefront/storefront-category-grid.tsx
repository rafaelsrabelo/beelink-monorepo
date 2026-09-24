// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontCategoriesEmpty } from "./storefront-categories-empty"
import { StorefrontCategoryCard, type StorefrontCategoryCardItem } from "./storefront-category-card"

/** Kept under its old name: the grid's item is the card's. */
export type StorefrontCategoryGridItem = StorefrontCategoryCardItem

export type StorefrontCategoryColumns = 2 | 3 | 4 | 5 | 6

export interface StorefrontCategoryGridProps {
  categories: readonly StorefrontCategoryGridItem[]
  /** `(categorySlug) => href`, built by the screen: a block never knows the shop's route words. */
  href: (categorySlug: string) => string
  /** Where to send someone when the shop has no categories to index. */
  catalogHref?: string
  /** Spells the count. A formatter cannot live in a dictionary, so the block does it. */
  locale?: string
  /** Across, where the cell has room. Three when the shopkeeper left it to the grid. */
  columns?: StorefrontCategoryColumns
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Read from the cell, not the viewport, as the product grid's are: six across in a third of a wide
 * screen would be six cards too small to read. Two is the floor on a phone, whatever was chosen.
 */
const COLUMNS: Record<StorefrontCategoryColumns, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 @xl:grid-cols-3",
  4: "grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4",
  5: "grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5",
  6: "grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5 @6xl:grid-cols-6",
}

/**
 * Every category the shop has, in rows.
 *
 * Not the band under the header: that one filters a catalogue and stays whole while it filters.
 * This is a destination, so each card carries what the band has no room for — the photograph at
 * full size, and how much is waiting behind it.
 */
export function StorefrontCategoryGrid({
  categories,
  href,
  catalogHref,
  locale = defaultLocale,
  columns = 3,
  linkComponent = AnchorLink,
  messages = defaultMessages,
}: StorefrontCategoryGridProps) {
  if (!categories.length) {
    return (
      <StorefrontCategoriesEmpty
        {...(catalogHref ? { catalogHref } : {})}
        linkComponent={linkComponent}
        messages={messages}
      />
    )
  }

  return (
    <section className="@container w-full">
      <ul className={cn("grid gap-3", COLUMNS[columns])}>
        {categories.map((category) => (
          <li key={category.id}>
            <StorefrontCategoryCard
              category={category}
              href={href(category.slug)}
              locale={locale}
              linkComponent={linkComponent}
              messages={messages}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
