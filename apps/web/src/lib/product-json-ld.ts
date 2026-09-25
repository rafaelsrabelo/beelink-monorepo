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
 * price range the shop's cards show, from what can be ordered now, and whether anything can — and
 * the `BreadcrumbList` of the page's trail. Only real data: no rating until reviews exist, and never
 * the Markdown, only its words.
 *
 * The addresses are the site's own paths. A search engine resolves them against the page; an
 * absolute origin waits for a setting that says what the site's address is.
 */
export function productJsonLd({ product, url, shopName, crumbs, showPrice }: ProductJsonLdInput): object[] {
  // The API's range, not one worked out again here: it runs over what a customer can order now, so a
  // sold-out combination at 69,90 never becomes a "from" price nobody can buy at.
  const orderable = product.variants.filter((variant) => variant.available).length
  const available = orderable > 0 && !product.soldOut
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
              lowPrice: reais(product.priceRange.minCents),
              highPrice: reais(product.priceRange.maxCents),
              offerCount: orderable || product.variants.length,
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
