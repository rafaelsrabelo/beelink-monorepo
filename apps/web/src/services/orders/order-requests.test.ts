// Libs
import { describe, expect, it } from "vitest"

// App
import { OrderRequestError, shortagesOf } from "./order-requests"

describe("shortagesOf", () => {
  it("reads the short lines of a stock refusal, and none from any other failure", () => {
    const shortages = [{ variantId: "v1", available: 2 }]

    expect(shortagesOf(new OrderRequestError("ORDER_STOCK_INSUFFICIENT", { shortages }))).toEqual(shortages)
    expect(shortagesOf(new OrderRequestError("ORDER_VARIANT_INVALID", { shortages }))).toEqual([])
    expect(shortagesOf(new OrderRequestError("ORDER_STOCK_INSUFFICIENT"))).toEqual([])
    expect(shortagesOf(new Error("network"))).toEqual([])
  })
})
