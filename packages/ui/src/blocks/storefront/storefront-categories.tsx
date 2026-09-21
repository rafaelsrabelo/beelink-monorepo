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

export interface StorefrontCategoriesProps {
  categories: readonly StorefrontCategory[]
  /** The category being shown, or null for all of them. */
  active?: string | null
  /** `(categorySlug | null) => href`, built by the screen. */
  href: (slug: string | null) => string
  /** Tiles with a photograph, as most Brazilian shops show them, or plain chips. */
  withImages?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** Two letters, so a category with no photograph is still a mark and not an empty hole. */
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
 * A category with no photograph shows its initial on the shop's own colour rather than an empty
 * grey circle. That is not decoration: there is no panel screen for categories yet, so today every
 * `imageUrl` in a real shop is null, and a row of blank circles reads as a broken page.
 */
export function StorefrontCategories({
  categories,
  active = null,
  href,
  withImages = true,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCategoriesProps) {
  const text = messages.storefront

  if (!categories.length) return null

  return (
    <nav aria-label={text.categoriesLabel} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex items-start gap-4">
        {[null, ...categories.map((category) => category.slug)].map((slug) => {
          const category = categories.find((entry) => entry.slug === slug)
          const current = active === slug
          const label = category?.name ?? text.allCategories

          return (
            <li key={slug ?? "all"}>
              <Link
                href={href(slug)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-2 text-center text-xs",
                  withImages ? "w-20 sm:w-24" : "",
                  current ? "font-semibold" : "opacity-75",
                )}
              >
                {withImages ? (
                  <span
                    className="flex size-16 items-center justify-center overflow-hidden rounded-full text-lg font-semibold sm:size-20"
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
                ) : null}
                <span className={withImages ? "line-clamp-2" : "rounded-full border border-current/20 px-3 py-1.5"}>
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
