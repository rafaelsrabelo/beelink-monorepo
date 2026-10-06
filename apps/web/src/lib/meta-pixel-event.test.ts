// Libs
import { describe, expect, it } from "vitest"

// App
import { metaEventOf, reaisOf } from "./meta-pixel-event"

const HAZE = "01a0d395-c1ab-7399-a472-000000000001"
const WHEY = "01a0d395-c1ab-7399-a472-000000000002"

describe("a storefront event in Meta's words", () => {
  it("reads whole cents as a decimal number of reais", () => {
    expect(reaisOf(12990)).toBe(129.9)
    expect(reaisOf(5)).toBe(0.05)
    expect(reaisOf(0)).toBe(0)
  })

  it("sends a page view with nothing on it", () => {
    expect(metaEventOf({ name: "PageView" })).toEqual({ name: "PageView", params: {} })
  })

  it("names a product seen by its own id, with its name, category, price and currency", () => {
    expect(metaEventOf({ name: "ViewContent", product: { id: HAZE, name: "Haze", priceCents: 12990, category: "Pré-treino" } })).toEqual({
      name: "ViewContent",
      params: { content_ids: [HAZE], content_type: "product", contents: [{ id: HAZE, quantity: 1 }], content_name: "Haze", content_category: "Pré-treino", value: 129.9, currency: "BRL" },
    })
  })

  it("leaves the category out of a product filed under none", () => {
    expect(metaEventOf({ name: "ViewContent", product: { id: HAZE, name: "Haze", priceCents: 100, category: null } }).params).not.toHaveProperty("content_category")
  })

  it("sends a search as the words typed", () => {
    expect(metaEventOf({ name: "Search", term: "whey 900g" })).toEqual({ name: "Search", params: { search_string: "whey 900g" } })
  })

  it("sends a like with what the heart knew: always the product, the name and the price when it had them", () => {
    expect(metaEventOf({ name: "AddToWishlist", product: { id: HAZE, name: "Haze", priceCents: 9990 } }).params).toEqual({
      content_ids: [HAZE],
      content_type: "product",
      contents: [{ id: HAZE, quantity: 1 }],
      content_name: "Haze",
      value: 99.9,
      currency: "BRL",
    })
    expect(metaEventOf({ name: "AddToWishlist", product: { id: HAZE } }).params).toEqual({ content_ids: [HAZE], content_type: "product", contents: [{ id: HAZE, quantity: 1 }] })
  })

  it("values what went into the cart at the unit price times the quantity", () => {
    expect(metaEventOf({ name: "AddToCart", item: { productId: HAZE, name: "Haze", unitPriceCents: 12990, qty: 3 } })).toEqual({
      name: "AddToCart",
      params: { content_ids: [HAZE], content_type: "product", contents: [{ id: HAZE, quantity: 3 }], content_name: "Haze", value: 389.7, currency: "BRL" },
    })
  })

  it("counts a checkout's items, and adds two combinations of one product into one entry", () => {
    const items = [
      { productId: HAZE, unitPriceCents: 1000, qty: 2 },
      { productId: WHEY, unitPriceCents: 5000, qty: 1 },
      { productId: HAZE, unitPriceCents: 1200, qty: 1 },
    ]

    expect(metaEventOf({ name: "InitiateCheckout", items, valueCents: 8200 })).toEqual({
      name: "InitiateCheckout",
      params: {
        content_ids: [HAZE, WHEY],
        content_type: "product",
        contents: [
          { id: HAZE, quantity: 3 },
          { id: WHEY, quantity: 1 },
        ],
        num_items: 4,
        value: 82,
        currency: "BRL",
      },
    })
  })

  it("sends a payment picked with the cart and its value, and never which way of paying it was", () => {
    const sent = metaEventOf({ name: "AddPaymentInfo", items: [{ productId: WHEY, unitPriceCents: 5000, qty: 1 }], valueCents: 5000 })

    expect(sent).toEqual({ name: "AddPaymentInfo", params: { content_ids: [WHEY], content_type: "product", contents: [{ id: WHEY, quantity: 1 }], value: 50, currency: "BRL" } })
  })
})
