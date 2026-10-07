// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { ScrollRail } from "./scroll-rail"
import { StorefrontCategoriesEmpty } from "./storefront-categories-empty"
import {
  StorefrontCategoryCard,
  type StorefrontCategoryCardItem,
  type StorefrontCategoryCardStyle,
} from "./storefront-category-card"

export interface StorefrontCategoryRailProps {
  categories: readonly StorefrontCategoryCardItem[]
  /** `(categorySlug) => href`, built by the screen: a block never knows the shop's route words. */
  href: (categorySlug: string) => string
  /** Where to send someone when the shop has no categories to show. */
  catalogHref?: string
  /** The name the scrollable region answers to — the block's title when it has one. */
  label?: string
  /** The artwork alone, or the photo with its name — the default, and what a category with no picture draws anyway. */
  cardStyle?: StorefrontCategoryCardStyle
  locale?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Fixed per breakpoint, for the product rail's reason: a fluid card on a rail is a card whose width
 * is an accident of the viewport. Narrower than a product's, because a category card holds a name
 * and not a price — three and a peek on a phone.
 */
const CARD_WIDTH = "w-32 shop-sm:w-40 shop-lg:w-48"

/**
 * A step wider when the card is the artwork alone: the picture carries the words, and at 128px they
 * are too small to read. Two and a peek on a phone.
 */
const ART_WIDTH = "w-36 shop-sm:w-44 shop-lg:w-52"

/**
 * Every category the shop has, on one row that scrolls sideways — what the shopkeeper asked for
 * when the grid of them took a screen of its own on a phone.
 *
 * The product rail's `ScrollRail`, so the snap, the arrows and the reach without script are the
 * same, and the grid's card, so switching one for the other changes the row and never the card.
 */
export function StorefrontCategoryRail({
  categories,
  href,
  catalogHref,
  label,
  cardStyle = "PHOTO_WITH_NAME",
  locale = defaultLocale,
  linkComponent = AnchorLink,
  messages = defaultMessages,
}: StorefrontCategoryRailProps) {
  const text = messages.storefront
  const art = cardStyle === "ART_ONLY"

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
    <ScrollRail label={label ?? text.categoriesLabel} previousLabel={text.railPrevious} nextLabel={text.railNext}>
      {/*
        The track scrolls sideways, so it clips above and below: the artwork's focus ring sits outside
        the square, and the padding is the room it is drawn in.
      */}
      <ul className={cn("flex gap-3 px-4", art && "py-1")}>
        {categories.map((category) => (
          <li key={category.id} className={cn("shrink-0 snap-start", art ? ART_WIDTH : CARD_WIDTH)}>
            <StorefrontCategoryCard
              category={category}
              href={href(category.slug)}
              cardStyle={cardStyle}
              locale={locale}
              linkComponent={linkComponent}
              messages={messages}
            />
          </li>
        ))}
      </ul>
    </ScrollRail>
  )
}
