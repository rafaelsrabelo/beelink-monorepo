// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontCategory {
  id: string
  slug: string
  name: string
  imageUrl: string | null
}

/**
 * How the band draws itself.
 *
 * `bar` is a menu: a line of words across the top of the shop, which is what the shops this was
 * measured against use and what reads as navigation rather than as content. `tiles` is the row of
 * photographs, which reads as a shelf and belongs to a shop whose categories are actually
 * photographed — today none are, because no panel screen uploads one.
 */
export type StorefrontCategoriesVariant = "bar" | "tiles"

export interface StorefrontCategoriesProps {
  categories: readonly StorefrontCategory[]
  /** The category being shown, or null for all of them. */
  active?: string | null
  /** `(categorySlug | null) => href`, built by the screen. */
  href: (slug: string | null) => string
  variant?: StorefrontCategoriesVariant
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** One letter, so a category with no photograph is still a mark and not an empty hole. */
function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase()
}

/**
 * The shop's own categories, as a band under the header.
 *
 * Links, never buttons with handlers: the address is what says which catalogue you are looking at,
 * so a filtered shop is bookmarkable, shareable and indexable, and it works before any JavaScript
 * arrives. Every category the shop has stays listed while one of them filters — navigation that
 * disappears when you use it is navigation you cannot get back out of.
 *
 * The bar is the default because it is what a menu looks like, and it is what the shop owner asked
 * for after seeing the row of circles: a circle is a picture, and a shop with no pictures for its
 * categories — which is every shop today — gets a row of single letters standing in for its menu.
 * The words were always the navigation; the photographs were decoration laid over them.
 *
 * It runs the full width of its band and scrolls sideways when the words do not fit, rather than
 * wrapping: a menu two rows tall on a phone has stopped reading as a menu.
 */
export function StorefrontCategories({
  categories,
  active = null,
  href,
  variant = "bar",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCategoriesProps) {
  const text = messages.storefront

  if (!categories.length) return null

  const slugs = [null, ...categories.map((category) => category.slug)]

  if (variant === "bar") {
    return (
      <nav
        aria-label={text.categoriesLabel}
        // Bleeds past the band's padding so the first word starts at the page's margin and the
        // last one is not trapped behind it once the row scrolls.
        className="no-scrollbar -mx-4 overflow-x-auto shop-sm:-mx-6"
      >
        <ul className="flex items-stretch gap-1 px-4 shop-sm:px-6">
          {slugs.map((slug) => {
            const category = categories.find((entry) => entry.slug === slug)
            const current = active === slug

            return (
              <li key={slug ?? "all"} className="shrink-0">
                <Link
                  href={href(slug)}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center px-3 text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition-opacity",
                    current ? "opacity-100" : "opacity-70 hover:opacity-100",
                  )}
                  // The open one is underlined in the shop's own colour rather than filled: a
                  // filled chip in a menu bar reads as a button, and these are places, not actions.
                  style={current ? { boxShadow: "inset 0 -2px 0 0 var(--shop-primary)" } : undefined}
                >
                  {category?.name ?? text.allCategories}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    )
  }

  return (
    <nav aria-label={text.categoriesLabel} className="-mx-4 overflow-x-auto px-4 shop-sm:mx-0 shop-sm:px-0">
      <ul className="flex items-start gap-4">
        {slugs.map((slug) => {
          const category = categories.find((entry) => entry.slug === slug)
          const current = active === slug

          return (
            <li key={slug ?? "all"}>
              <Link
                href={href(slug)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex w-20 shrink-0 flex-col items-center gap-2 text-center text-xs shop-sm:w-24",
                  current ? "font-semibold" : "opacity-75",
                )}
              >
                <span
                  className="flex size-16 items-center justify-center overflow-hidden rounded-full text-lg font-semibold shop-sm:size-20"
                  style={{
                    backgroundColor: category?.imageUrl
                      ? undefined
                      : "color-mix(in oklab, var(--shop-primary) 18%, transparent)",
                    boxShadow: current ? "0 0 0 2px var(--shop-primary)" : undefined,
                  }}
                >
                  {category?.imageUrl ? (
                    <img src={category.imageUrl} alt="" aria-hidden="true" className="size-full object-cover" />
                  ) : (
                    <span aria-hidden="true">{category ? initialOf(category.name) : "•"}</span>
                  )}
                </span>
                <span className="line-clamp-2">{category?.name ?? text.allCategories}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
