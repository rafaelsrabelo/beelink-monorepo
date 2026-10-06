// Libs
import { describe, expect, it } from "vitest"

// Lib
import { isRefundable, orderPaymentStateOf } from "./order-payment"

describe("orderPaymentStateOf", () => {
  const online = { status: "RECEIVED", paymentChannel: "ONLINE" } as const

  it("says nothing of an order settled with the shop: bee-link never knows it paid", () => {
    expect(orderPaymentStateOf({ status: "RECEIVED", paymentChannel: "OFFLINE", payment: null })).toBeNull()
    expect(orderPaymentStateOf({ status: "RECEIVED" })).toBeNull()
  })

  it("is paid once approved or received, on a card as on a Pix", () => {
    expect(orderPaymentStateOf({ ...online, payment: { status: "CONFIRMED" } })).toBe("paid")
    expect(orderPaymentStateOf({ ...online, payment: { status: "RECEIVED" } })).toBe("paid")
  })

  it("waits with a charge to pay, one past its day, one removed, one refused, and with none yet", () => {
    for (const status of ["PENDING", "OVERDUE", "CANCELLED", "FAILED"] as const) expect(orderPaymentStateOf({ ...online, payment: { status } })).toBe("awaiting")
    expect(orderPaymentStateOf({ ...online, payment: null })).toBe("awaiting")
  })

  it("says the money went back, whole or in part", () => {
    expect(orderPaymentStateOf({ ...online, payment: { status: "REFUNDED" } })).toBe("refunded")
    expect(orderPaymentStateOf({ ...online, payment: { status: "PARTIALLY_REFUNDED" } })).toBe("partlyRefunded")
  })

  it("waits for nothing on a cancelled order nobody paid, and still says one that was", () => {
    expect(orderPaymentStateOf({ status: "CANCELLED", paymentChannel: "ONLINE", payment: { status: "CANCELLED" } })).toBeNull()
    expect(orderPaymentStateOf({ status: "CANCELLED", paymentChannel: "ONLINE", payment: null })).toBeNull()
    expect(orderPaymentStateOf({ status: "CANCELLED", paymentChannel: "ONLINE", payment: { status: "RECEIVED" } })).toBe("paid")
  })

  it("says a refund is on its way while the shop still holds the money (BEELINK-208)", () => {
    expect(orderPaymentStateOf({ ...online, payment: { status: "CONFIRMED", refundingCents: 5990 } })).toBe("refunding")
    expect(orderPaymentStateOf({ ...online, payment: { status: "PARTIALLY_REFUNDED", refundingCents: 100 } })).toBe("refunding")
    expect(orderPaymentStateOf({ status: "CANCELLED", paymentChannel: "ONLINE", payment: { status: "CONFIRMED", refundingCents: 5990 } })).toBe("refunding")
    expect(orderPaymentStateOf({ ...online, payment: { status: "REFUNDED", refundingCents: 0 } })).toBe("refunded")
  })
})

describe("isRefundable", () => {
  it("is so only while the shop holds money a refund may still ask for", () => {
    expect(isRefundable({ status: "RECEIVED", refundableCents: 5990 })).toBe(true)
    expect(isRefundable({ status: "PARTIALLY_REFUNDED", refundableCents: 1 })).toBe(true)
    expect(isRefundable({ status: "CONFIRMED", refundableCents: 0 })).toBe(false)
    expect(isRefundable({ status: "REFUNDED", refundableCents: 0 })).toBe(false)
    expect(isRefundable({ status: "PENDING", refundableCents: 5990 })).toBe(false)
    expect(isRefundable(null)).toBe(false)
  })
})
