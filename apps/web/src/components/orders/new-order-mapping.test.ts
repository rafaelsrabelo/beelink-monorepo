// Libs
import { describe, expect, it } from "vitest"

// Types
import type { OrderQuote, ProductDetail } from "@harness-monorepo/contracts"
import type { OrderDetailsValues } from "@harness-monorepo/ui/lib/order-form"

// App
import { canonicalPhoneOf, moneyOf, orderPayloadOf, saleOf, shownTotalsOf, variantOptionsOf } from "./new-order-mapping"

const details: OrderDetailsValues = { fulfillment: "DELIVERY", deliveryFee: "10", paymentMethod: "PIX", discount: "", note: "  ", placedOn: "" }
const totals = { subtotalCents: 5000, deliveryFeeCents: 1000, discountCents: 0, totalCents: 6000 }
const lines = [{ variantId: "v1", productName: "Whey", variantLabel: null, unitPriceCents: 5000, quantity: 1, available: null }]

describe("variantOptionsOf", () => {
  it("labels each combination the shop sells as the API photographs it, and marks the one with none left", () => {
    const product = {
      options: [
        { id: "o1", name: "Sabor", values: [{ id: "uva", name: "Uva", colorHex: null }, { id: "coco", name: "Coco", colorHex: null }] },
        { id: "o2", name: "Peso", values: [{ id: "300", name: "300 g", colorHex: null }] },
      ],
      variants: [
        { id: "v1", optionValueIds: ["uva", "300"], isActive: true, priceCents: 3990, sku: "U", trackStock: true, stockQuantity: 0 },
        { id: "v2", optionValueIds: ["coco", "300"], isActive: true, priceCents: 4290, sku: null, trackStock: false, stockQuantity: null },
        { id: "v3", optionValueIds: ["coco", "300"], isActive: false, priceCents: 1, sku: null, trackStock: false, stockQuantity: null },
      ],
    } as unknown as ProductDetail

    expect(variantOptionsOf(product)).toEqual([
      { id: "v1", label: "Sabor: Uva · Peso: 300 g", priceCents: 3990, sku: "U", outOfStock: true, available: 0 },
      { id: "v2", label: "Sabor: Coco · Peso: 300 g", priceCents: 4290, sku: null, outOfStock: false, available: null },
    ])
  })
})

describe("canonicalPhoneOf", () => {
  it("writes a phone however typed as the API keeps it", () => {
    expect(canonicalPhoneOf("(11) 97777-6666")).toBe("5511977776666")
    expect(canonicalPhoneOf("(011) 97777-6666")).toBe("5511977776666")
    expect(canonicalPhoneOf("0 21 11 97777-6666")).toBe("5511977776666")
    expect(canonicalPhoneOf("+55 11 97777-6666")).toBe("5511977776666")
  })
})

describe("moneyOf", () => {
  it("reads empty as zero and refuses what is not money", () => {
    expect(moneyOf("")).toBe(0)
    expect(moneyOf("10,50")).toBe(1050)
    expect(moneyOf("dez")).toBeNull()
  })
})

describe("orderPayloadOf", () => {
  it("sends the customer by id, no prices, no empty note, and leaves today to the API", () => {
    expect(orderPayloadOf({ customerId: "c1", lines, details, paymentMethod: "PIX", totals, today: "2026-09-25" })).toEqual({
      customer: { id: "c1" },
      items: [{ variantId: "v1", quantity: 1 }],
      fulfillment: "DELIVERY",
      deliveryFeeCents: 1000,
      paymentMethod: "PIX",
    })
  })

  it("sends a day past at its noon, in the shopkeeper's zone, so it stays that day", () => {
    const payload = orderPayloadOf({ customerId: "c1", lines, details: { ...details, placedOn: "2026-09-20" }, paymentMethod: "PIX", totals, today: "2026-09-25" })

    const placed = new Date(payload.placedAt!)
    expect([placed.getFullYear(), placed.getMonth() + 1, placed.getDate(), placed.getHours()]).toEqual([2026, 9, 20, 12])
  })
})

/** BEELINK-194: the sale is priced by the API before it is registered, asked exactly as the order will be. */
describe("saleOf", () => {
  const sale = { customerId: null, lines, fulfillment: "DELIVERY" as const, deliveryFeeCents: 1000, discountCents: 500, placedOn: "", today: "2026-09-25" }

  it("prices the sale as the order will be sent: no prices, zero amounts left out, today left to the API", () => {
    expect(saleOf(sale)).toEqual({ items: [{ variantId: "v1", quantity: 1 }], fulfillment: "DELIVERY", deliveryFeeCents: 1000, discountCents: 500 })
    expect(saleOf({ ...sale, deliveryFeeCents: 0, discountCents: 0, placedOn: "2026-09-25" })).toEqual({ items: [{ variantId: "v1", quantity: 1 }], fulfillment: "DELIVERY" })
  })

  it("dates a past sale at its noon: the promotions of that day are the ones read", () => {
    const placed = new Date(saleOf({ ...sale, placedOn: "2026-09-20" }).placedAt!)

    expect([placed.getFullYear(), placed.getMonth() + 1, placed.getDate(), placed.getHours()]).toEqual([2026, 9, 20, 12])
  })

  it("is what the order sends, and nothing the order does not", () => {
    const order = orderPayloadOf({ customerId: "c1", lines, details: { ...details, placedOn: "2026-09-20" }, paymentMethod: "PIX", totals: { ...totals, discountCents: 500 }, today: "2026-09-25" })

    expect(order).toMatchObject(saleOf({ ...sale, customerId: "c1", placedOn: "2026-09-20" }))
  })

  /** BEELINK-245: a first-purchase promotion is the customer's, and the API applies it once the order names them. */
  it("names the customer once one is chosen, so the price is theirs — and another customer is another question", () => {
    expect(saleOf(sale)).not.toHaveProperty("customer")
    expect(saleOf({ ...sale, customerId: "c1" })).toMatchObject({ customer: { id: "c1" } })
    expect(JSON.stringify(saleOf({ ...sale, customerId: "c1" }))).not.toBe(JSON.stringify(saleOf({ ...sale, customerId: "c2" })))
  })
})

describe("shownTotalsOf", () => {
  const quote: OrderQuote = {
    lines: [{ variantId: "v1", productId: "p1", quantity: 1, unitPriceCents: 5000, lineTotalCents: 5000, discountCents: 500, promotion: { id: "pr1", name: "Semana do Whey" } }],
    subtotalCents: 5000,
    promotionDiscountCents: 500,
    firstPurchase: null,
    coupon: null,
    couponDiscountCents: 0,
    manualDiscountCents: 300,
    discountCents: 800,
    deliveryFeeCents: 1000,
    totalCents: 5200,
  }

  it("is the form's own sum until the API answered", () => {
    expect(shownTotalsOf(totals, null, null)).toBe(totals)
  })

  it("is the API's pricing once it answered: the promotion apart from what was typed, and the total it would write", () => {
    expect(shownTotalsOf(totals, quote, null)).toEqual({
      subtotalCents: 5000,
      deliveryFeeCents: 1000,
      discountCents: 300,
      totalCents: 5200,
      priced: [{ discountCents: 500, promotionName: "Semana do Whey" }],
    })
  })

  it("says the API's refusal of a typed amount — a discount larger than what the promotions left", () => {
    expect(shownTotalsOf(totals, null, "ORDER_DISCOUNT_TOO_LARGE")).toBe("DISCOUNT_TOO_LARGE")
    expect(shownTotalsOf(totals, null, "ORDER_TOTAL_TOO_LARGE")).toBe("TOTAL_TOO_LARGE")
    // Any other failure — the API out of reach — leaves the form's sum standing.
    expect(shownTotalsOf(totals, null, "UNKNOWN")).toBe(totals)
  })

  it("keeps the form's own refusal, whatever the API said of an older sale", () => {
    expect(shownTotalsOf("DISCOUNT_TOO_LARGE", quote, null)).toBe("DISCOUNT_TOO_LARGE")
  })
})

