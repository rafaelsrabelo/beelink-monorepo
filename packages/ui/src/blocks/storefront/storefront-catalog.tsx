// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontProductCard, type StorefrontProduct } from "./storefront-product-card"

export interface StorefrontCatalogProps {
  products: readonly StorefrontProduct[]
  productHref: (productSlug: string) => string
  /** Where "see everything" goes when a filter left nothing behind. */
  clearHref?: string
  locale: string
  productsPerRow?: 2 | 3 | 4
  showPrice?: boolean
  showBadge?: boolean
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
 * What the shop is selling, as a grid.
 *
 * The search lives in the header and the categories are a band of their own, because both belong
 * to the page rather than to the list — a shop with one category still has a search, and a
 * product page still has both. What is left here is the list and what to say when it is empty.
 *
 * An empty result is a sentence and a way out, never a blank page: someone who filtered into a
 * corner needs the door more than they need an explanation.
 */
export function StorefrontCatalog({
  products,
  productHref,
  clearHref,
  locale,
  productsPerRow = 3,
  showPrice = true,
  showBadge = true,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
  children,
}: StorefrontCatalogProps) {
  const text = messages.storefront

  return (
    <section className="flex w-full flex-col gap-6">
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
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-medium">{text.empty}</p>
          <p className="text-sm opacity-70">{text.emptyHint}</p>
          {clearHref ? (
            <Link
              href={clearHref}
              className="mt-2 rounded-xl px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
            >
              {text.allCategories}
            </Link>
          ) : null}
        </div>
      )}

      {children}
    </section>
  )
}
