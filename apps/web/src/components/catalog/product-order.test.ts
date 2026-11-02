// Libs
import { describe, expect, it } from "vitest"

// App
import { reconciledOrder, sameOrder } from "./product-order"

describe("reconciledOrder", () => {
  it("keeps the arranged order while the shop's list is the same", () => {
    expect(reconciledOrder(["c", "a", "b"], ["a", "b", "c"])).toEqual(["c", "a", "b"])
  })

  it("drops what left the shop and puts what joined it at the end", () => {
    expect(reconciledOrder(["c", "a", "b"], ["a", "c", "d", "e"])).toEqual(["c", "a", "d", "e"])
  })
})

describe("sameOrder", () => {
  it("is about the order, not only the members", () => {
    expect(sameOrder(["a", "b"], ["a", "b"])).toBe(true)
    expect(sameOrder(["a", "b"], ["b", "a"])).toBe(false)
    expect(sameOrder(["a"], ["a", "b"])).toBe(false)
  })
})
