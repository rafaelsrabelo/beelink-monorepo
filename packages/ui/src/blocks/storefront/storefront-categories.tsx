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
  /**
   * The category whose own page this is: it gets `aria-current`. Null on every other page — the
   * home, the search, the product — where "Tudo" is not the page either.
   */
  active?: string | null
  /** Whether this is the whole catalogue's own page, which is the one "Tudo" names. */
  allActive?: boolean
  /**
   * The category to underline without saying it is the page: a product's, as 5b draws it, or a
   * search narrowed to it. Where `active` is given it is the same one and this can be left out.
   */
  marked?: string | null
  /** `(categorySlug | null) => href`, built by the screen. */
  href: (slug: string | null) => string
  /** The catalogue narrowed to what is on sale, drawn last and apart. Absent when nothing is. */
  offersHref?: string | null
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
 *
 * Drawn as 5a and 5b draw it: 13px capitals, 28px apart, the open one underlined in the brand
 * toned against the header — `--shop-primary` alone vanished on a header painted in the brand —
 * and "Ofertas do dia" at the far end in the paler tone, when the shop has something on sale.
 */
export function StorefrontCategories({
  categories,
  active = null,
  allActive = false,
  marked = null,
  href,
  offersHref = null,
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
        className="no-scrollbar -mx-4 overflow-x-auto shop-sm:-mx-6 shop-lg:-mx-8"
      >
        <ul className="flex items-stretch gap-7 px-4 text-[13px] font-bold tracking-[0.04em] uppercase shop-sm:px-6 shop-lg:px-8">
          {slugs.map((slug) => {
            const category = categories.find((entry) => entry.slug === slug)
            // Null is "Tudo", and it is the page only when the page says so: the home, a search
            // and a product are not the catalogue, and used to be marked as if they were.
            const current = slug === null ? allActive : active === slug
            const underlined = current || (marked !== null && marked === slug)

            return (
              <li key={slug ?? "all"} className="shrink-0">
                <Link
                  href={href(slug)}
                  aria-current={current ? "page" : undefined}
                  className="flex h-11 items-center whitespace-nowrap"
                  // Underlined in the shop's own colour rather than filled: a filled chip in a menu
                  // bar reads as a button, and these are places, not actions.
                  style={underlined ? { boxShadow: "inset 0 -3px 0 0 var(--shop-primary-on-header)" } : undefined}
                >
                  {category?.name ?? text.allCategories}
                </Link>
              </li>
            )
          })}
          {offersHref ? (
            <li className="ml-auto shrink-0">
              <Link href={offersHref} className="flex h-11 items-center whitespace-nowrap" style={{ color: "var(--shop-primary-on-header-soft)" }}>
                {text.dailyOffers}
              </Link>
            </li>
          ) : null}
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
