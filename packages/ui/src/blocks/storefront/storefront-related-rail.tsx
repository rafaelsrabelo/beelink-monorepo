// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { ScrollRail } from "./scroll-rail"
import { StorefrontProductCard, type StorefrontProduct } from "./storefront-product-card"
import { PRODUCT_SECTION_HEADING, StorefrontProductSection } from "./storefront-product-section"

export interface StorefrontRelatedRailProps {
  products: readonly StorefrontProduct[]
  /** Built by the screen: a block never knows that a product lives under `/<shop>/<word>/<slug>`. */
  productHref: (productSlug: string) => string
  locale: string
  showPrice?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** 5b's six across at 1440, 16px apart: four on a laptop, three on a tablet, two and a peek on a phone. */
export const RELATED_CARD_WIDTH = "w-40 shop-sm:w-[calc((100%-32px)/3)] shop-lg:w-[calc((100%-48px)/4)] shop-xl:w-[calc((100%-80px)/6)]"

/**
 * "Você também pode gostar": other products of the same category, as 5b's compact cards, a page at a
 * time with "Página 1 de 3" beside the title. Named for what it is — 5b's "Clientes que viram este
 * item também viram" would claim a tracking the shop does not do.
 */
export function StorefrontRelatedRail({ products, productHref, locale, showPrice = true, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontRelatedRailProps) {
  const text = messages.storefront
  if (products.length === 0) return null

  return (
    <StorefrontProductSection className="gap-4">
      <ScrollRail
        label={text.relatedHeading}
        previousLabel={text.railPrevious}
        nextLabel={text.railNext}
        heading={<h2 className={PRODUCT_SECTION_HEADING}>{text.relatedHeading}</h2>}
        pageStatus={text.paginationStatus}
      >
        <ul className="flex gap-4 px-4">
          {products.map((product) => (
            <li key={product.id} className={cn("shrink-0 snap-start", RELATED_CARD_WIDTH)}>
              <StorefrontProductCard
                product={product}
                href={productHref(product.slug)}
                locale={locale}
                showPrice={showPrice}
                density="compact"
                linkComponent={Link}
                messages={messages}
              />
            </li>
          ))}
        </ul>
      </ScrollRail>
    </StorefrontProductSection>
  )
}
