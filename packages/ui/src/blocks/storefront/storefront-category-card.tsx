// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { StorefrontCategory } from "./storefront-categories"

export interface StorefrontCategoryCardItem extends StorefrontCategory {
  /** The whole category, never the page being shown: it is the promise the card makes. */
  productCount: number
  /**
   * The shopkeeper's own line about the category. It has been a column since the beginning and
   * nothing rendered it, so every card said the same thing — a number — about categories the
   * shopkeeper had already taken the trouble to describe.
   */
  description?: string | null
}

export interface StorefrontCategoryCardProps {
  category: StorefrontCategoryCardItem
  href: string
  /** Spells the count. A formatter cannot live in a dictionary, so the block does it. */
  locale?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** One letter, so a category with no photograph is still a mark and not an empty hole. */
function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase()
}

/**
 * One category, as a door: the photograph at full size, the name, and what is behind it. The grid
 * and the rail draw the same card, so switching one for the other changes the row and never the
 * card.
 *
 * The whole card is the link, for the reason the product card is: a card where only part of it is
 * clickable teaches a visitor that clicking it does nothing, and they stop trying.
 *
 * A category with no photograph shows its initial on the shop's own colour. There is no panel
 * screen for categories yet, so every `imageUrl` in a real shop is null today, and a page of grey
 * holes reads as one that failed to load.
 */
export function StorefrontCategoryCard({
  category,
  href,
  locale = defaultLocale,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCategoryCardProps) {
  const text = messages.storefront

  return (
    <Link href={href} className="group flex flex-col gap-2 rounded-xl p-2 transition-colors hover:bg-black/5">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/5">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            // Decorative on purpose: the name sits right below, so naming the photograph after the
            // category makes a screen reader read the same name twice per card.
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          // Hidden for the same reason the photograph is: the letter is the name's first character
          // drawn large, and hearing it before the name is hearing a typo.
          <span
            aria-hidden="true"
            className="flex size-full items-center justify-center text-4xl font-semibold"
            style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
          >
            {initialOf(category.name)}
          </span>
        )}
      </div>

      <p className="line-clamp-2 text-sm font-semibold">{category.name}</p>

      {/*
        The shopkeeper's line when there is one, and how much is behind the card when there is not —
        never both. Two lines of grey under every name is what turns a page of categories into a
        wall, and the number is the weaker of the two: it says how many, where the description says
        why.

        The arrow is part of the same sentence and hidden from the accessibility tree: the whole
        card is already a link, and an arrow announced after the text is a second thing to step
        through that goes exactly where the first one did.
      */}
      <p className="line-clamp-1 text-xs opacity-70">
        {category.description?.trim()
          ? category.description
          : format(category.productCount === 1 ? text.productCountOne : text.productCount, {
              count: new Intl.NumberFormat(locale).format(category.productCount),
            })}
        <span aria-hidden="true" className="ml-1 inline-block transition-transform group-hover:ml-2">
          →
        </span>
      </p>
    </Link>
  )
}
