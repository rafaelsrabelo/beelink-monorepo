// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PublicProductReviews } from "@harness-monorepo/contracts"

// App
import { productReviewsAddressOf, productReviewsHrefOf, productReviewsQueryOf, summaryRowsOf } from "./product-reviews-view"

describe("the product's reviews in its address", () => {
  it("reads a rating and a page, and anything else as none", () => {
    expect(productReviewsAddressOf({ nota: "4", "pagina-avaliacoes": "2" })).toEqual({ rating: 4, page: 2 })
    expect(productReviewsAddressOf({ nota: "9", "pagina-avaliacoes": "x" })).toEqual({ rating: undefined, page: 1 })
    expect(productReviewsQueryOf({ rating: 4, page: 2 })).toEqual({ rating: 4, page: 2 })
    expect(productReviewsQueryOf({ rating: undefined, page: 1 })).toEqual({})
  })

  it("keeps the combination chosen, lands on the section, and starts a new rating at page one", () => {
    const query = { variant: "v-1", nota: "5", "pagina-avaliacoes": "3" }
    expect(productReviewsHrefOf("/loja/produtos/whey", query, { rating: 4 })).toBe("/loja/produtos/whey?variant=v-1&nota=4#avaliacoes")
    expect(productReviewsHrefOf("/loja/produtos/whey", query, { page: 4 })).toBe("/loja/produtos/whey?variant=v-1&nota=5&pagina-avaliacoes=4#avaliacoes")
    expect(productReviewsHrefOf("/loja/produtos/whey", query, { rating: undefined })).toBe("/loja/produtos/whey?variant=v-1#avaliacoes")
  })

  it("draws the histogram five stars first, in whole percent, the chosen one marked", () => {
    const reviews = { summary: { average: 4.5, count: 4, histogram: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 3 } }, reviews: [], total: 4, page: 1, pageSize: 10 } satisfies PublicProductReviews
    const rows = summaryRowsOf(reviews, "/loja/produtos/whey", {}, 5)
    expect(rows.map((row) => [row.stars, row.percent, row.active])).toEqual([
      [5, 75, true],
      [4, 0, false],
      [3, 25, false],
      [2, 0, false],
      [1, 0, false],
    ])
    expect(rows[0]!.href).toBe("/loja/produtos/whey?nota=5#avaliacoes")
  })

  it("never reads 0% for a rating some reviews have", () => {
    const reviews = { summary: { average: 5, count: 300, histogram: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 299 } }, reviews: [], total: 300, page: 1, pageSize: 10 } satisfies PublicProductReviews
    expect(summaryRowsOf(reviews, "/loja/produtos/whey", {}, undefined).map((row) => row.percent)).toEqual([100, 0, 0, 0, 1])
  })
})
