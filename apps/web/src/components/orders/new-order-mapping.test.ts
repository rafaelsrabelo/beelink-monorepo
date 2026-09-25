// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ProductDetail } from "@harness-monorepo/contracts"
import type { OrderDetailsValues } from "@harness-monorepo/ui/lib/order-form"

// App
import { moneyOf, orderPayloadOf, variantOptionsOf } from "./new-order-mapping"

const details: OrderDetailsValues = { fulfillment: "DELIVERY", deliveryFee: "10", paymentMethod: "PIX", discount: "", note: "  ", placedOn: "" }
const totals = { subtotalCents: 5000, deliveryFeeCents: 1000, discountCents: 0, totalCents: 6000 }
const lines = [{ variantId: "v1", productName: "Whey", variantLabel: null, unitPriceCents: 5000, quantity: 1, outOfStock: false }]

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
      { id: "v1", label: "Sabor: Uva · Peso: 300 g", priceCents: 3990, sku: "U", outOfStock: true },
      { id: "v2", label: "Sabor: Coco · Peso: 300 g", priceCents: 4290, sku: null, outOfStock: false },
    ])
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
