// Libs
import { describe, expect, it } from "vitest"

// App
import { shopReviewsAddressOf, shopReviewsHrefOf, shopReviewsQueryOf } from "./shop-review-view"

const PRODUCT = "01a0d395-c1ab-7399-a472-000000000001"

describe("the panel's reviews' address", () => {
  it("reads status, rating, product and page in the panel's words, and anything else as none", () => {
    expect(shopReviewsAddressOf(new URLSearchParams(`estado=ocultas&nota=2&produto=${PRODUCT.toUpperCase()}&pagina=3`))).toEqual({ status: "HIDDEN", rating: 2, productId: PRODUCT, page: 3 })
    expect(shopReviewsAddressOf(new URLSearchParams("estado=constructor&nota=7&produto=whey&pagina=-1"))).toEqual({ status: undefined, rating: undefined, productId: undefined, page: 1 })
  })

  it("asks the API only what the address narrowed", () => {
    expect(shopReviewsQueryOf({ status: undefined, rating: undefined, productId: undefined, page: 1 })).toEqual({})
    expect(shopReviewsQueryOf({ status: "PUBLISHED", rating: 5, productId: PRODUCT, page: 2 })).toEqual({ status: "PUBLISHED", rating: 5, productId: PRODUCT, page: 2 })
  })

  it("writes the address back, a changed filter starting at page one", () => {
    const address = { status: "HIDDEN" as const, rating: 1 as const, productId: undefined, page: 4 }
    expect(shopReviewsHrefOf("loja", address, { productId: PRODUCT })).toBe(`/admin/loja/reviews?estado=ocultas&nota=1&produto=${PRODUCT}`)
    expect(shopReviewsHrefOf("loja", address, { page: 5 })).toBe("/admin/loja/reviews?estado=ocultas&nota=1&pagina=5")
    expect(shopReviewsHrefOf("loja", address, { status: undefined, rating: undefined })).toBe("/admin/loja/reviews")
  })
})
