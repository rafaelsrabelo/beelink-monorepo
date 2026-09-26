// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { StorefrontCategoryCardItem } from "./storefront-category-card"

export interface StorefrontCategoryChipsProps {
  categories: readonly StorefrontCategoryCardItem[]
  /** `(categorySlug) => href`, built by the screen: a block never knows the shop's route words. */
  href: (categorySlug: string) => string
  /** The list's name for a screen reader — the block's title when it has one. */
  label?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The categories as "Chips": their names as pills that wrap, no photos — for a shop whose categories
 * have none, or a band that should take one line and not a row of cards.
 *
 * The same categories as the cards, so switching between the layouts loses nothing.
 */
export function StorefrontCategoryChips({
  categories,
  href,
  label,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCategoryChipsProps) {
  if (!categories.length) return null

  return (
    <ul aria-label={label ?? messages.storefront.categoriesLabel} className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={href(category.slug)}
            className="block rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-[color-mix(in_oklab,var(--shop-primary)_10%,transparent)]"
            style={{ borderColor: "var(--shop-line-strong)" }}
          >
            {category.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}
