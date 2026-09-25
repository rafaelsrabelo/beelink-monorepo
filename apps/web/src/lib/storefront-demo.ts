import "server-only"

// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// App
import { serverEnv } from "./server-env"

/**
 * Example reviews, for the one place they may be shown: a shop nobody buys from.
 *
 * There is no reviews domain yet (the designer's note says it needs a feature of its own), and
 * the owner asked to see the layout with ratings anyway. A rating invented and shown to a real
 * buyer is a false claim about a product, so this is the only source of one, it is off unless
 * `STOREFRONT_DEMO_REVIEWS` says otherwise, and even then it answers only for the shops named in
 * `STOREFRONT_DEMO_SHOPS`. No production environment sets either. Nothing here reaches
 * `packages/contracts`, the API, JSON-LD or a meta tag: when the real domain exists, this file is
 * what changes.
 *
 * Server-only, so the design preview — a client tree — cannot import it, and so the values are
 * computed once, deterministically from the product's id, and never disagree between the server's
 * HTML and the browser's hydration.
 */

export interface DemoRating {
  /** One decimal, 3.8 to 5.0. */
  average: number
  count: number
}

export interface DemoReview {
  id: string
  stars: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
  /** "Sabor: Chocolate · 900 g", from the product's own options. */
  variantLabel: string | null
  /** As the design writes it: a day the reviewer was there. */
  date: string
  verified: boolean
}

export interface DemoReviews {
  rating: DemoRating
  /** Five rows, five stars first, in whole percent. They add up to 100. */
  histogram: { stars: 5 | 4 | 3 | 2 | 1; percent: number }[]
  reviews: DemoReview[]
}

/** Whether example reviews may be drawn for this shop at all. */
export function demoReviewsEnabledFor(slug: string): boolean {
  return serverEnv.STOREFRONT_DEMO_REVIEWS && serverEnv.STOREFRONT_DEMO_SHOPS.includes(slug)
}

/** A small stable hash, so the same product always gets the same numbers. */
function seedOf(text: string): number {
  let hash = 2166136261
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  return hash
}

/** The example rating of one product: varied across a shelf, stable across renders. */
export function demoRatingOf(productId: string): DemoRating {
  const seed = seedOf(productId)
  return { average: 3.8 + ((seed % 13) * 0.1), count: 12 + (seed % 300) }
}

/** The example ratings of a page of products, keyed by id, or nothing when the shop may not show them. */
export function demoRatingsFor(slug: string, productIds: readonly string[]): Record<string, DemoRating> {
  if (!demoReviewsEnabledFor(slug)) return {}
  return Object.fromEntries(productIds.map((id) => [id, demoRatingOf(id)]))
}

/** The example reviews of one product, with its own options in the variant labels. */
export function demoReviewsOf(slug: string, product: Pick<PublicProductDetail, "id" | "options">): DemoReviews | null {
  if (!demoReviewsEnabledFor(slug)) return null

  const rating = demoRatingOf(product.id)
  const values = product.options.map((option) => option.values[0]).filter((value) => value !== undefined)
  const variantLabel = values.length
    ? product.options.map((option, at) => `${option.name}: ${values[at]?.name ?? ""}`).join(" · ")
    : null

  return {
    rating,
    histogram: [
      { stars: 5, percent: 78 },
      { stars: 4, percent: 14 },
      { stars: 3, percent: 5 },
      { stars: 2, percent: 1 },
      { stars: 1, percent: 2 },
    ],
    reviews: [
      {
        id: `${product.id}-demo-1`,
        stars: 5,
        title: "Exemplo de avaliação",
        body: "Este texto é um exemplo. As avaliações reais chegam quando a loja puder recebê-las.",
        variantLabel,
        date: "2026-09-01",
        verified: true,
      },
      {
        id: `${product.id}-demo-2`,
        stars: 4,
        title: "Outro exemplo",
        body: "Também um exemplo, para mostrar como a seção fica com mais de uma avaliação.",
        variantLabel,
        date: "2026-08-20",
        verified: true,
      },
    ],
  }
}
