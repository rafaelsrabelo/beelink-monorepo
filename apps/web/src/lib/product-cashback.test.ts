// Libs
import { describe, expect, it } from "vitest"

// App
import { productCashbackRuleOf } from "./product-cashback"

const SHOP = { mode: "STORE", rateBps: 500, minSubtotalCents: 5_000 } as const

describe("productCashbackRuleOf", () => {
  it("is nothing while the shop's cashback is off", () => {
    expect(productCashbackRuleOf(null, { cashbackRateBps: 1000 })).toBeNull()
  })

  it("is the shop's one rate, whatever the product kept of its own", () => {
    expect(productCashbackRuleOf(SHOP, { cashbackRateBps: 1000 })).toEqual({ rateBps: 500, minSubtotalCents: 5_000 })
  })

  it("is the product's own rate in a shop that gives by product, under the shop's minimum", () => {
    expect(productCashbackRuleOf({ ...SHOP, mode: "PRODUCT" }, { cashbackRateBps: 1000 })).toEqual({ rateBps: 1000, minSubtotalCents: 5_000 })
  })

  it("is nothing for a product with no rate in a shop that gives by product", () => {
    expect(productCashbackRuleOf({ ...SHOP, mode: "PRODUCT" }, { cashbackRateBps: null })).toBeNull()
  })
})
