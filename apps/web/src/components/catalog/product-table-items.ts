// UI
import type { ProductTableItem } from "@harness-monorepo/ui/blocks/catalog/product-table"

// Types
import type { Product, ProductPage } from "@harness-monorepo/contracts"

export interface ProductTableContext {
  /** The category names as the categories screen has them, fresher than the product's own copy. */
  categoryNames: ReadonlyMap<string, string>
  /** The product's page on the shop window, from `storefrontRoutes`; null until the shop is read. */
  pageOf: ((productSlug: string) => string) | null
  carrierGaps: ProductPage["carrierGaps"] | undefined
  /** Each product's own rate on the default table (IMPULSEIA-102); absent while the programme is off. */
  commissionRates?: ReadonlyMap<string, number>
}

/** One product of the panel's list, as the table draws it. */
export function productTableItemOf(product: Product, context: ProductTableContext): ProductTableItem {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    imageUrl: product.images[0]?.url ?? null,
    categoryName: product.category ? (context.categoryNames.get(product.category.id) ?? product.category.name) : null,
    status: product.status,
    soldOut: product.soldOut,
    origin: product.origin,
    trackStock: product.trackStock,
    stockQuantity: product.stockQuantity,
    // A draft has no page on the shop window — the public read filters on ACTIVE — so the eye must
    // not point at a 404. A sold-out product does still have one.
    viewHref: product.status === "DRAFT" || !context.pageOf ? null : context.pageOf(product.slug),
    // What a carrier lacks to quote it (BEELINK-184); the API says nothing for a shop with no carrier.
    carrierGap: context.carrierGaps?.[product.id] ?? null,
    cashbackRateBps: product.cashbackRateBps,
    commissionRateBps: context.commissionRates?.get(product.id) ?? null,
  }
}
