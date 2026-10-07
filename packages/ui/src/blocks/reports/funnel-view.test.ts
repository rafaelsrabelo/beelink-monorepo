// Libs
import { describe, expect, it } from "vitest"

// Block
import { funnelIsEmpty, funnelRowsOf, per100Text } from "./funnel-view"
import { cardHeavyFunnel, emptyFunnel, sampleFunnel } from "./reports.fixtures"

describe("the funnel's rows", () => {
  it("sets each step against the one before: how many per hundred, and how many fewer", () => {
    const rows = funnelRowsOf([
      { step: "PAGE_VIEW", count: 200 },
      { step: "PRODUCT_VIEW", count: 50 },
      { step: "ADD_TO_CART", count: 10 },
      { step: "CHECKOUT_START", count: 10 },
      { step: "PURCHASE", count: 4 },
    ])

    expect(rows.map((row) => [row.step, row.per100, row.drop])).toEqual([
      ["PAGE_VIEW", null, null],
      ["PRODUCT_VIEW", 25, 150],
      ["ADD_TO_CART", 20, 40],
      // As many as before: no drop to say.
      ["CHECKOUT_START", 100, null],
      ["PURCHASE", 40, 6],
    ])
  })

  it("says a step larger than the one before as it is — events, not people — with no drop", () => {
    const [, , cart] = funnelRowsOf(cardHeavyFunnel)

    expect([cart!.per100, cart!.drop]).toEqual([130, null])
  })

  it("has no rate over a step that counted nothing", () => {
    const rows = funnelRowsOf([
      { step: "PAGE_VIEW", count: 10 },
      { step: "PRODUCT_VIEW", count: 0 },
      { step: "ADD_TO_CART", count: 3 },
    ])

    expect(rows.map((row) => row.per100)).toEqual([null, 0, null])
    expect(rows[1]!.drop).toBe(10)
  })

  it("measures the bars against the largest step, wherever it is, and never past the track", () => {
    expect(funnelRowsOf(sampleFunnel).map((row) => row.share)).toEqual([1, 612 / 1840, 148 / 1840, 96 / 1840, 41 / 1840])
    const shares = funnelRowsOf([
      { step: "PAGE_VIEW", count: 5 },
      { step: "ADD_TO_CART", count: 20 },
    ]).map((row) => row.share)
    expect(shares).toEqual([0.25, 1])
    expect(funnelRowsOf(emptyFunnel).map((row) => row.share)).toEqual([0, 0, 0, 0, 0])
  })

  it("is empty when the shop window counted nothing, whatever the orders say", () => {
    expect(funnelIsEmpty(emptyFunnel)).toBe(true)
    expect(funnelIsEmpty(emptyFunnel.map((step) => (step.step === "PURCHASE" ? { ...step, count: 7 } : step)))).toBe(true)
    expect(funnelIsEmpty(sampleFunnel)).toBe(false)
    expect(funnelIsEmpty(emptyFunnel.map((step) => (step.step === "ADD_TO_CART" ? { ...step, count: 1 } : step)))).toBe(false)
  })

  it("writes a rate with one decimal at most, as the reader writes numbers", () => {
    expect(per100Text(33.2608, "pt-BR")).toBe("33,3")
    expect(per100Text(130, "pt-BR")).toBe("130")
    expect(per100Text(2.55, "en")).toBe("2.6")
    expect(per100Text(0, "pt-BR")).toBe("0")
  })
})
