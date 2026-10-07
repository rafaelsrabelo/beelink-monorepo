// Libs
import { describe, expect, it } from "vitest"

// App
import { PURCHASE_TOLD_WITHIN_MS, purchaseCountsWhen, purchasedAtOf, purchaseEventIdOf, purchaseOf, purchaseOrderOf, type PurchaseOrder } from "./purchase"

// Types
import type { CustomerOrder } from "@harness-monorepo/contracts"

const ID = "0b9f6c1e-5a44-4a8b-9d55-3f1f1c2a7e10"
const WHEY = "01a0d395-c1ab-7399-a472-000000000001"
const HAZE = "01a0d395-c1ab-7399-a472-000000000002"
const PLACED = "2026-10-06T12:00:00.000Z"
const PAID = "2026-10-06T15:00:00.000Z"
const after = (iso: string, ms: number) => new Date(new Date(iso).getTime() + ms)

/** Settled with the shop, placed from the cart: two whey with a promotion on the line, one haze, a coupon and delivery. */
const offline: PurchaseOrder = {
  id: ID,
  status: "RECEIVED",
  placedBy: "CUSTOMER",
  paymentChannel: "OFFLINE",
  // 25980 + 8950 of goods, 2000 off the whey's line, 1000 of coupon, 1500 of delivery.
  totalCents: 33430,
  deliveryFeeCents: 1500,
  placedAt: PLACED,
  items: [
    { productId: WHEY, quantity: 2, lineTotalCents: 25980, discountCents: 2000 },
    { productId: HAZE, quantity: 1, lineTotalCents: 8950, discountCents: 0 },
  ],
  payment: null,
}
const online: PurchaseOrder = { ...offline, paymentChannel: "ONLINE", payment: { status: "PENDING", paidAt: null } }
const paid: PurchaseOrder = { ...online, payment: { status: "CONFIRMED", paidAt: PAID } }

describe("which order counts as a purchase, and when", () => {
  it("counts an order settled with the shop when it is placed, and one charged on the site when it is paid", () => {
    expect(purchaseCountsWhen(offline)).toBe("PLACED")
    expect(purchaseCountsWhen(online)).toBe("PAID")
  })

  it("counts an order charged on the site with nothing to pay like one settled with the shop", () => {
    expect(purchaseCountsWhen({ ...online, totalCents: 0, deliveryFeeCents: 0 })).toBe("PLACED")
    // A total of zero while the delivery's fee is not agreed is not a closed one: there may yet be a charge.
    expect(purchaseCountsWhen({ ...online, totalCents: 0, deliveryFeeCents: null })).toBe("PAID")
  })

  it("dates an order settled with the shop from when it was placed", () => {
    expect(purchasedAtOf(offline)).toBe(PLACED)
  })

  it.each([
    ["no charge yet", null],
    ["a charge still to be paid", { status: "PENDING", paidAt: null }],
    ["a charge past its day", { status: "OVERDUE", paidAt: null }],
    ["a charge removed", { status: "CANCELLED", paidAt: null }],
    ["a payment given back", { status: "REFUNDED", paidAt: PAID }],
    ["a payment given back in part", { status: "PARTIALLY_REFUNDED", paidAt: PAID }],
  ] as const)("counts no purchase for an order charged on the site with %s", (_name, payment) => {
    expect(purchasedAtOf({ ...online, payment })).toBeNull()
  })

  it.each(["CONFIRMED", "RECEIVED"] as const)("dates an order charged on the site from when its payment was %s", (status) => {
    expect(purchasedAtOf({ ...online, payment: { status, paidAt: PAID } })).toBe(PAID)
  })

  it("counts nothing the shop registered in its panel, whoever opens it", () => {
    expect(purchasedAtOf({ ...offline, placedBy: "SHOP" })).toBeNull()
    expect(purchasedAtOf({ ...paid, placedBy: "SHOP" })).toBeNull()
  })

  it("counts nothing cancelled, paid or not", () => {
    expect(purchasedAtOf({ ...offline, status: "CANCELLED" })).toBeNull()
    expect(purchasedAtOf({ ...paid, status: "CANCELLED" })).toBeNull()
  })
})

describe("the purchase told of an order", () => {
  it("is named by the order's own id, the same from wherever it is told", () => {
    expect(purchaseEventIdOf(ID)).toBe(`purchase-${ID}`)
    expect(purchaseOf(offline, after(PLACED, 1000))).toMatchObject({ orderId: ID, eventId: `purchase-${ID}` })
  })

  it("is worth the order's total — delivery in, every discount out — with each line at what it cost after its promotion", () => {
    expect(purchaseOf(offline, after(PLACED, 1000))?.event).toEqual({
      name: "Purchase",
      valueCents: 33430,
      items: [
        { productId: WHEY, qty: 2, paidCents: 23980 },
        { productId: HAZE, qty: 1, paidCents: 8950 },
      ],
    })
  })

  it("leaves out a line whose product is gone, and keeps the value", () => {
    const order = { ...offline, items: [...offline.items, { productId: null, quantity: 1, lineTotalCents: 1000, discountCents: 0 }] }

    expect(purchaseOf(order, after(PLACED, 1000))?.event).toMatchObject({ valueCents: 33430, items: [{ productId: WHEY }, { productId: HAZE }] })
  })

  it("is told for a day after it counted, and never after: from the order placed, or from the payment", () => {
    expect(purchaseOf(offline, after(PLACED, PURCHASE_TOLD_WITHIN_MS))).not.toBeNull()
    expect(purchaseOf(offline, after(PLACED, PURCHASE_TOLD_WITHIN_MS + 1))).toBeNull()
    // Paid three hours after it was placed: the day runs from the payment.
    expect(purchaseOf(paid, after(PAID, PURCHASE_TOLD_WITHIN_MS))).not.toBeNull()
    expect(purchaseOf(paid, after(PAID, PURCHASE_TOLD_WITHIN_MS + 1))).toBeNull()
  })

  it("is none for an order that is no purchase", () => {
    expect(purchaseOf(online, after(PLACED, 1000))).toBeNull()
    expect(purchaseOf({ ...offline, status: "CANCELLED" }, after(PLACED, 1000))).toBeNull()
  })

  it("is read from an order cut down to what the rule needs: nothing of the customer, the address or the lines' names", () => {
    const whole = {
      ...offline,
      number: 12,
      deliveryAddress: { recipientName: "Bia Cliente" },
      items: offline.items.map((item) => ({ ...item, productName: "Whey", imageUrl: null })),
      payment: { status: "CONFIRMED", paidAt: PAID, amountCents: 33430, refunds: [] },
    } as unknown as CustomerOrder

    expect(purchaseOrderOf(whole)).toEqual({ ...offline, payment: { status: "CONFIRMED", paidAt: PAID } })
  })
})
