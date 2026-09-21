// React
import type { ReactNode } from "react"

// Libs
import { SearchIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontProductCard, type StorefrontProduct } from "./storefront-product-card"

export interface StorefrontCategory {
  id: string
  slug: string
  name: string
  imageUrl: string | null
}

export interface StorefrontCatalogProps {
  categories: readonly StorefrontCategory[]
  products: readonly StorefrontProduct[]
  /** The category currently shown, or null for all of them. */
  activeCategory?: string | null
  /** What is in the search box — the screen owns it, because the address does. */
  search?: string
  /** Where the search form submits. A form and not a listener: a search must survive no JavaScript. */
  searchAction: string
  /** `(categorySlug | null) => href`, built by the screen. */
  categoryHref: (slug: string | null) => string
  productHref: (productSlug: string) => string
  locale: string
  productsPerRow?: 2 | 3 | 4
  showPrice?: boolean
  showBadge?: boolean
  /** Categories as image tiles, as most Brazilian shops show them, or as plain chips. */
  showCategoryImages?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
  children?: ReactNode
}

const COLUMNS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}

/**
 * The catalogue: a search, the shop's categories, and what matches.
 *
 * The search is a `<form method="get">` and the categories are links, not buttons with handlers.
 * Both facts follow from the same decision — the address is what says which catalogue you are
 * looking at. A filtered shop is therefore bookmarkable, shareable, indexable and survives the
 * back button, and the whole thing works before any JavaScript arrives.
 *
 * The category row keeps every category the shop has, never only the ones the current filter
 * left: navigation that disappears when you use it is navigation you cannot get back out of.
 */
export function StorefrontCatalog({
  categories,
  products,
  activeCategory = null,
  search = "",
  searchAction,
  categoryHref,
  productHref,
  locale,
  productsPerRow = 3,
  showPrice = true,
  showBadge = true,
  showCategoryImages = true,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
  children,
}: StorefrontCatalogProps) {
  const text = messages.storefront

  return (
    <section className="flex w-full flex-col gap-6">
      <form method="get" action={searchAction} role="search" className="relative w-full">
        <label htmlFor="storefront-search" className="sr-only">
          {text.search}
        </label>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-60"
        />
        <input
          id="storefront-search"
          type="search"
          name="busca"
          defaultValue={search}
          placeholder={text.search}
          className="h-11 w-full rounded-xl border border-current/15 bg-transparent pr-3 pl-9 text-base outline-none focus-visible:border-current/40"
        />
        {/* A shop's category filter must survive a search: the form carries it along. */}
        {activeCategory ? <input type="hidden" name="categoria" value={activeCategory} /> : null}
        <button type="submit" className="sr-only">
          {text.searchAction}
        </button>
      </form>

      {categories.length ? (
        <nav aria-label={text.productsHeading} className="-mx-4 overflow-x-auto px-4">
          <ul className="flex items-start gap-3">
            {[null, ...categories.map((category) => category.slug)].map((slug) => {
              const category = categories.find((entry) => entry.slug === slug)
              const current = activeCategory === slug
              const label = category?.name ?? text.allCategories

              return (
                <li key={slug ?? "all"}>
                  <Link
                    href={categoryHref(slug)}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 flex-col items-center gap-2 text-center text-xs",
                      showCategoryImages ? "w-20" : "",
                      current ? "font-semibold" : "opacity-75",
                    )}
                  >
                    {showCategoryImages ? (
                      <span
                        className={cn(
                          "size-16 overflow-hidden rounded-full bg-black/5",
                          current && "ring-2 ring-offset-2",
                        )}
                        style={current ? { boxShadow: "0 0 0 2px var(--shop-primary)" } : undefined}
                      >
                        {category?.imageUrl ? (
                          <img src={category.imageUrl} alt="" aria-hidden="true" className="size-full object-cover" />
                        ) : null}
                      </span>
                    ) : null}
                    <span className={showCategoryImages ? "line-clamp-2" : "rounded-full border border-current/20 px-3 py-1.5"}>
                      {label}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      ) : null}

      {products.length ? (
        <ul className={cn("grid gap-3", COLUMNS[productsPerRow])}>
          {products.map((product) => (
            <li key={product.id}>
              <StorefrontProductCard
                product={product}
                href={productHref(product.slug)}
                locale={locale}
                showPrice={showPrice}
                showBadge={showBadge}
                linkComponent={Link}
                messages={messages}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-1 py-12 text-center">
          <p className="font-medium">{text.empty}</p>
          <p className="text-sm opacity-70">{text.emptyHint}</p>
        </div>
      )}

      {children}
    </section>
  )
}
