// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// App
import { cartViewOf, orderItemsOf, rowKeyOf, type CartRow } from "./cart-view"

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

describe("orderItemsOf", () => {
  const row = (over: Partial<CartRow>): CartRow => ({
    productId: "p",
    variantId: null,
    orderVariantId: "v1",
    name: "Blusa",
    slug: "blusa",
    variantLabel: null,
    imageUrl: null,
    unitPriceCents: 5990,
    compareAtPriceCents: null,
    qty: 1,
    lineTotalCents: 5990,
    available: true,
    ...over,
  })

  it("names each combination once, adding up two lines that point at it, and leaves a sold-out line out", () => {
    const rows = [row({ qty: 2 }), row({ variantId: "v1", qty: 1 }), row({ orderVariantId: "v2", qty: 3, available: false })]

    expect(orderItemsOf(rows)).toEqual([{ variantId: "v1", quantity: 3 }])
  })
})

/** Plan 2026-11-10--kits-monte-seu-kit: a kit's line, read against its products. */
describe("a kit's line", () => {
  const flavour = (id: string, name: string, available = true) =>
    ({ id, slug: id, name, imageUrl: null, soldOut: !available, options: [], variants: [{ id: `${id}-v`, optionValueIds: [], priceCents: 700, compareAtPriceCents: null, imageUrl: null, available }] }) as unknown as PublicProductDetail
  const kit = { ...blusa, id: "p-kit", slug: "kit-festa", name: "Kit Festa", variants: [{ ...blusa.variants[0]!, id: "k-default", priceCents: 13980 }] } as unknown as PublicProductDetail
  const ninho = flavour("p-ninho", "Ninho com Nutella")
  const pacoca = flavour("p-pacoca", "Paçoquinha")
  const line = (parts: [string, number][], qty = 1) => ({ productId: "p-kit", variantId: null, qty, kit: parts.map(([productId, partQty]) => ({ productId, qty: partQty })) })

  it("says what went in it, prices it at the kit's price, and sends what was chosen with it", () => {
    const view = cartViewOf([line([["p-ninho", 12], ["p-pacoca", 8]], 2)], [kit, ninho, pacoca])
    const row = view.rows[0]!

    expect(row).toMatchObject({ name: "Kit Festa", variantLabel: "12× Ninho com Nutella · 8× Paçoquinha", unitPriceCents: 13980, lineTotalCents: 27960, available: true })
    expect(orderItemsOf(view.rows)).toEqual([{ variantId: "k-default", quantity: 2, kit: [{ variantId: "p-ninho-v", quantity: 12 }, { variantId: "p-pacoca-v", quantity: 8 }] }])
  })

  it("keeps two kits with other products in them on two lines, with two keys", () => {
    const view = cartViewOf([line([["p-ninho", 20]]), line([["p-pacoca", 20]])], [kit, ninho, pacoca])

    expect(orderItemsOf(view.rows)).toHaveLength(2)
    expect(new Set(view.rows.map(rowKeyOf)).size).toBe(2)
  })

  it("is sold out while anything chosen for it ran out, and gone once anything chosen left the shop", () => {
    expect(cartViewOf([line([["p-ninho", 20]])], [kit, flavour("p-ninho", "Ninho com Nutella", false)]).rows[0]?.available).toBe(false)

    const gone = cartViewOf([line([["p-ninho", 12], ["p-pacoca", 8]])], [kit, ninho])
    expect(gone.rows).toEqual([])
    expect(gone.gone).toHaveLength(1)
  })
})

