// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// App
import { cartViewOf } from "./cart-view"

const whey = {
  id: "p-whey",
  slug: "whey",
  name: "Whey",
  imageUrl: "whey.jpg",
  soldOut: false,
  options: [
    { id: "o-sabor", name: "Sabor", values: [{ id: "v-choc", name: "Chocolate", colorHex: null }, { id: "v-uva", name: "Uva", colorHex: null }] },
    { id: "o-peso", name: "Peso", values: [{ id: "v-900", name: "900 g", colorHex: null }] },
  ],
  variants: [
    { id: "w-choc", optionValueIds: ["v-choc", "v-900"], priceCents: 8990, compareAtPriceCents: 15990, imageUrl: "whey-choc.jpg", available: true },
    { id: "w-uva", optionValueIds: ["v-uva", "v-900"], priceCents: 8990, compareAtPriceCents: null, imageUrl: null, available: false },
  ],
} as unknown as PublicProductDetail

const blusa = {
  id: "p-blusa",
  slug: "blusa",
  name: "Blusa",
  imageUrl: null,
  soldOut: false,
  options: [],
  variants: [{ id: "b-default", optionValueIds: [], priceCents: 5990, compareAtPriceCents: null, imageUrl: null, available: true }],
} as unknown as PublicProductDetail

describe("cartViewOf", () => {
  it("prices each line from the catalogue and names the combination from the product's own options", () => {
    const view = cartViewOf(
      [
        { productId: "p-whey", variantId: "w-choc", qty: 2 },
        { productId: "p-blusa", variantId: null, qty: 1 },
      ],
      [whey, blusa],
    )

    expect(view.rows.map((row) => [row.name, row.variantLabel, row.imageUrl, row.lineTotalCents])).toEqual([
      ["Whey", "Sabor: Chocolate · Peso: 900 g", "whey-choc.jpg", 17980],
      ["Blusa", null, null, 5990],
    ])
    expect(view.subtotalCents).toBe(23970)
    expect(view.count).toBe(3)
  })

  it("keeps a sold-out line in view, marked, and out of the total", () => {
    const view = cartViewOf([{ productId: "p-whey", variantId: "w-uva", qty: 1 }], [whey])

    expect(view.rows[0]).toMatchObject({ available: false, imageUrl: "whey.jpg" })
    expect(view.subtotalCents).toBe(0)
    expect(view.count).toBe(0)
  })

  it("sets aside a product the shop no longer sells, and a combination it switched off", () => {
    const view = cartViewOf(
      [
        { productId: "p-sumiu", variantId: null, qty: 1 },
        { productId: "p-whey", variantId: "w-desligada", qty: 1 },
        { productId: "p-whey", variantId: null, qty: 1 },
      ],
      [whey],
    )

    expect(view.rows).toEqual([])
    expect(view.gone).toHaveLength(3)
  })
})
