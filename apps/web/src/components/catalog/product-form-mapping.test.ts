// Libs
import { describe, expect, it } from "vitest"

// App
import { cashbackRateOf, EMPTY_FORM, fieldsOf } from "./product-form-mapping"

/** BEELINK-313: the product's own cashback, a percentage as typed, sent in basis points. */
describe("the product's cashback as the wire takes it", () => {
  it("reads a percentage as basis points, and an empty field as none", () => {
    expect(cashbackRateOf("5")).toBe(500)
    expect(cashbackRateOf("2,5")).toBe(250)
    expect(cashbackRateOf("100")).toBe(10_000)
    expect(cashbackRateOf("  ")).toBeNull()
  })

  it("refuses what is not a share of the price, rather than guess", () => {
    expect(cashbackRateOf("0")).toBeUndefined()
    expect(cashbackRateOf("100,01")).toBeUndefined()
    expect(cashbackRateOf("-5")).toBeUndefined()
    expect(cashbackRateOf("cinco")).toBeUndefined()
  })

  it("goes with the product's own fields, whatever its variations: a rate, or null to clear it", () => {
    expect(fieldsOf({ ...EMPTY_FORM, name: "Whey", cashback: "7,5" }).cashbackRateBps).toBe(750)
    expect(fieldsOf({ ...EMPTY_FORM, name: "Whey" }).cashbackRateBps).toBeNull()
  })
})
