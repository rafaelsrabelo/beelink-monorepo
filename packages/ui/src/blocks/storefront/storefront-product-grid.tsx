// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontProductCard, type StorefrontProduct } from "./storefront-product-card"
import { StorefrontShelfHeader } from "./storefront-shelf-header"

export type StorefrontGridColumns = 2 | 3 | 4 | 5 | 6

export interface StorefrontProductGridProps {
  products: readonly StorefrontProduct[]
  /** Built by the screen: a block never knows that a product lives under `/<shop>/<word>/<slug>`. */
  productHref: (productSlug: string) => string
  locale: string
  title: string
  label?: string
  seeAllHref?: string
  /** How many across the grid draws where its cell has the room. Four when the owner said nothing. */
  columns?: StorefrontGridColumns
  showPrice?: boolean
  showBadge?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The columns follow the cell and not the screen, for the reason the banner's grid gives: six across
 * in a third of a band are cards too small to read. Two on a phone, as every catalogue draws them,
 * and one more column for each step of room until the owner's count is reached.
 */
const COLUMNS: Record<StorefrontGridColumns, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 @xl:grid-cols-3",
  4: "grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4",
  5: "grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5",
  6: "grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5 @6xl:grid-cols-6",
}

/**
 * A showcase drawn as a grid: its products in rows, every one visible at once.
 *
 * The rail's sibling, with the same header, for a shelf the shopkeeper wants seen whole — a short
 * pick, a category of six. Nothing to draw is nothing drawn: the screen decides whether an empty
 * showcase is an empty shop or a design-mode placeholder, and a block cannot tell those apart.
 */
export function StorefrontProductGrid({
  products,
  productHref,
  locale,
  title,
  label,
  seeAllHref,
  columns = 4,
  showPrice = true,
  showBadge = true,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontProductGridProps) {
  if (!products.length) return null

  return (
    <section className="@container flex w-full flex-col gap-3">
      <StorefrontShelfHeader
        title={title}
        {...(label ? { label } : {})}
        {...(seeAllHref ? { seeAllHref } : {})}
        linkComponent={Link}
        messages={messages}
      />

      <ul className={cn("grid gap-4", COLUMNS[columns])}>
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
    </section>
  )
}
