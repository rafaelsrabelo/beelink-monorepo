// Libs
import { describe, expect, it } from "vitest"

// Lib
import { orderTotalsOf } from "./order-form"

/** The API's own cases (apps/api order-totals.spec.ts): the screen and the API must agree on each. */
describe("orderTotalsOf", () => {
  it("adds the lines, the fee and takes the discount off, in cents", () => {
    expect(orderTotalsOf([{ unitPriceCents: 8990, quantity: 2 }, { unitPriceCents: 5990, quantity: 1 }], "DELIVERY", 1000, 500)).toEqual({
      subtotalCents: 23970,
      deliveryFeeCents: 1000,
      discountCents: 500,
      totalCents: 24470,
    })
  })

  it("charges no delivery on a pick-up, whatever was typed", () => {
    expect(orderTotalsOf([{ unitPriceCents: 1000, quantity: 1 }], "PICKUP", 1500, 0)).toMatchObject({ deliveryFeeCents: 0, totalCents: 1000 })
  })

  it("refuses a discount that takes the total below zero, and allows one that takes it to zero", () => {
    expect(orderTotalsOf([{ unitPriceCents: 1000, quantity: 1 }], "DELIVERY", 500, 1501)).toBe("DISCOUNT_TOO_LARGE")
    expect(orderTotalsOf([{ unitPriceCents: 1000, quantity: 1 }], "DELIVERY", 500, 1500)).toMatchObject({ totalCents: 0 })
  })

  it("refuses a line or an order past the cap", () => {
    expect(orderTotalsOf([{ unitPriceCents: 100_000_000, quantity: 22 }], "PICKUP", 0, 0)).toBe("TOTAL_TOO_LARGE")
    expect(orderTotalsOf([{ unitPriceCents: 100_000_000, quantity: 1 }], "DELIVERY", 1, 0)).toBe("TOTAL_TOO_LARGE")
    expect(orderTotalsOf([{ unitPriceCents: 100_000_000, quantity: 1 }], "PICKUP", 0, 0)).toMatchObject({ totalCents: 100_000_000 })
  })
})
