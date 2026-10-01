// Libs
import { describe, expect, it } from "vitest"

// App
import { customerTotalText, feeLineOf, feeToAgree, orderTotalText } from "./order-total"

const delivery = { fulfillment: "DELIVERY" as const, deliveryFeeCents: null, status: "RECEIVED" }

describe("a delivery's fee, on one rule for every screen", () => {
  it("is to be agreed while a delivery has none, and the total says '+ frete'", () => {
    expect(feeToAgree(delivery)).toBe(true)
    expect(feeLineOf(delivery)).toBe("toAgree")
    expect(orderTotalText("R$ 10,00", delivery, "{total} + frete")).toBe("R$ 10,00 + frete")
  })

  it("is the amount once agreed — zero is a free delivery, not one to agree", () => {
    expect(feeLineOf({ ...delivery, deliveryFeeCents: 1250 })).toEqual({ cents: 1250 })
    expect(feeLineOf({ ...delivery, deliveryFeeCents: 0 })).toEqual({ cents: 0 })
    expect(orderTotalText("R$ 10,00", { ...delivery, deliveryFeeCents: 0 }, "{total} + frete")).toBe("R$ 10,00")
  })

  it("has no line and no '+ frete' on a cancelled order that never agreed one", () => {
    const cancelled = { ...delivery, status: "CANCELLED" }

    expect(feeToAgree(cancelled)).toBe(false)
    expect(feeLineOf(cancelled)).toBeNull()
    expect(orderTotalText("R$ 10,00", cancelled, "{total} + frete")).toBe("R$ 10,00")
  })

  it("keeps the amount a cancelled order had agreed", () => {
    expect(feeLineOf({ ...delivery, status: "CANCELLED", deliveryFeeCents: 900 })).toEqual({ cents: 900 })
  })

  it("has no line for a pick-up", () => {
    expect(feeLineOf({ fulfillment: "PICKUP", deliveryFeeCents: 0, status: "RECEIVED" })).toBeNull()
    expect(feeToAgree({ fulfillment: "PICKUP", deliveryFeeCents: null })).toBe(false)
  })
})

/** BEELINK-194: a free-delivery coupon waives whatever fee is agreed, so its customer's total is final. */
describe("a total as its customer reads it", () => {
  it("leaves '+ frete' out under a free delivery coupon, and keeps it under any other", () => {
    expect(customerTotalText("R$ 10,00", { ...delivery, coupon: { kind: "FREE_SHIPPING" } }, "{total} + frete")).toBe("R$ 10,00")
    expect(customerTotalText("R$ 10,00", { ...delivery, coupon: { kind: "PERCENT" } }, "{total} + frete")).toBe("R$ 10,00 + frete")
    expect(customerTotalText("R$ 10,00", { ...delivery, coupon: null }, "{total} + frete")).toBe("R$ 10,00 + frete")
  })
})
