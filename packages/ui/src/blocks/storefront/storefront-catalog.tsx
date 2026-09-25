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
  /** What each card offers under its price — the web\'s "Adicionar ao carrinho". */
  cardAction?: (product: StorefrontProduct) => ReactNode
  /**
   * The way out of an empty shelf: with filters in force, the address of "Limpar tudo"; without,
   * the whole catalogue. Absent on the catalogue itself, which has nowhere wider to go.
   */
  clearHref?: string
  /** Filters are in force: the empty shelf says so, and offers "Ver tudo". */
  filtered?: boolean
  /** The shelf could not be read: it says so, and offers this address again. */
  retryHref?: string
  locale: string
  productsPerRow?: 2 | 3 | 4
  showPrice?: boolean
  showBadge?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
  children?: ReactNode
}

/**
 * The grid's columns, per the shopkeeper's choice, counted by the width the grid is given rather
 * than the window's: beside 5a's filter column a 1024px window leaves the grid 668px, room for
 * three cards and not four. Read inside an `@container`; exported so a skeleton takes the same shape.
 */
export const CATALOG_COLUMNS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 @xl:grid-cols-3",
  4: "grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-4",
}

/** The one button an empty or failed shelf offers. */
const WAY_OUT = "mt-2 rounded-xl bg-shop-primary px-4 py-2 text-sm font-medium text-shop-on-primary"

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
  cardAction,
  clearHref,
  filtered = false,
  retryHref,
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
    <section className="@container flex w-full flex-col gap-6">
      {products.length ? (
        <ul className={cn("grid gap-4", CATALOG_COLUMNS[productsPerRow])}>
          {products.map((product) => (
            <li key={product.id}>
              <StorefrontProductCard
                product={product}
                href={productHref(product.slug)}
                locale={locale}
                showPrice={showPrice}
                showBadge={showBadge}
                action={cardAction?.(product)}
                linkComponent={Link}
                messages={messages}
              />
            </li>
          ))}
        </ul>
      ) : retryHref ? (
        // An outage is not an empty shop: "nothing found" here would send the visitor away for good.
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-medium">{text.shelfFailed}</p>
          <p className="text-sm text-shop-muted">{text.shelfFailedHint}</p>
          <Link href={retryHref} className={WAY_OUT}>
            {text.shelfRetry}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-medium">{filtered ? text.emptyFiltered : text.empty}</p>
          <p className="text-sm text-shop-muted">{filtered ? text.emptyFilteredHint : text.emptyHint}</p>
          {clearHref ? (
            <Link href={clearHref} className={WAY_OUT}>
              {filtered ? text.emptySeeAll : text.emptyCatalog}
            </Link>
          ) : null}
        </div>
      )}

      {children}
    </section>
  )
}
