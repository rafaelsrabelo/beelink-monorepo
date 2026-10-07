// Libs
import { describe, expect, it } from "vitest"

// App
import { offersCartOf, sameOffersCart } from "./cart-offers"
import { cartQuoteOf } from "./cart-pricing"

const items = [{ variantId: "v1", quantity: 2 }]

describe("offersCartOf", () => {
  // The API's door refuses a body that carries anything else — and a code is none of its business.
  it("keeps the cart's lines, how it leaves, where to and by which carrier, and nothing else", () => {
    const asked = { items, fulfillment: "DELIVERY", addressId: "a1", shipping: { kind: "CARRIER", serviceId: 2 }, couponCode: "OCULTO10", useCashback: true } as const

    expect(offersCartOf(asked)).toEqual({ items, fulfillment: "DELIVERY", addressId: "a1", shipping: { kind: "CARRIER", serviceId: 2 } })
  })

  it("asks about no cart when there are no lines", () => {
    expect(offersCartOf({})).toEqual({})
    expect(offersCartOf({ items: [], fulfillment: "PICKUP" })).toEqual({ fulfillment: "PICKUP" })
  })

  // The page that served the first list and the browser that follows it have to ask one question.
  it("is one question for one cart, with or without the code the price is asked with", () => {
    const rows = [{ available: true, orderVariantId: "v1", qty: 2 }] as unknown as Parameters<typeof cartQuoteOf>[0]
    const served = offersCartOf(cartQuoteOf(rows, "DELIVERY", null, { addressId: "a1" }))
    const withCode = offersCartOf(cartQuoteOf(rows, "DELIVERY", "BEMVINDO10", { addressId: "a1", useCashback: true }))

    expect(sameOffersCart(served, withCode)).toBe(true)
    expect(sameOffersCart(served, offersCartOf(cartQuoteOf(rows, "PICKUP", null, { addressId: "a1" })))).toBe(false)
  })
})
