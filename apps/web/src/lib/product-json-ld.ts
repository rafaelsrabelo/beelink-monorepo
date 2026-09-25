// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { plainTextOf } from "@harness-monorepo/ui/lib/markdown"

export interface ProductJsonLdInput {
  product: PublicProductDetail
  /** The page's own address. */
  url: string
  shopName: string
  /** Início › category › product, as the trail on the page reads. */
  crumbs: readonly { name: string; url: string }[]
  /** The shop hides its prices: then there is no offer to describe. */
  showPrice: boolean
}

const reais = (cents: number) => (cents / 100).toFixed(2)

/**
 * What a search result draws a product from: schema.org's `Product` with an `AggregateOffer` — the
 * lowest and highest price across the combinations, and whether any can be ordered — and the
 * `BreadcrumbList` of the page's trail. Only real data: no rating until reviews exist, and never
 * the Markdown, only its words.
 *
 * The addresses are the site's own paths. A search engine resolves them against the page; an
 * absolute origin waits for a setting that says what the site's address is.
 */
export function productJsonLd({ product, url, shopName, crumbs, showPrice }: ProductJsonLdInput): object[] {
  const prices = product.variants.length > 0 ? product.variants.map((variant) => variant.priceCents) : [product.priceCents]
  const available = product.variants.length > 0 ? product.variants.some((variant) => variant.available) : !product.soldOut
  const description = product.description ? plainTextOf(product.description) : ""

  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      ...(description ? { description } : {}),
      ...(product.images.length > 0 ? { image: product.images.map((image) => image.url) } : {}),
      url,
      ...(showPrice
        ? {
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "BRL",
              lowPrice: reais(Math.min(...prices)),
              highPrice: reais(Math.max(...prices)),
              offerCount: prices.length,
              availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              seller: { "@type": "Organization", name: shopName },
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, at) => ({ "@type": "ListItem", position: at + 1, name: crumb.name, item: crumb.url })),
    },
  ]
}

/**
 * The JSON for a `<script type="application/ld+json">`. Every `<` is escaped: a product named
 * `</script><script>…` would otherwise close the tag and run, since this is written as HTML.
 */
export function jsonLdText(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
