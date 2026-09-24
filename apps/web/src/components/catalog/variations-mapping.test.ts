// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ProductDetail } from "@harness-monorepo/contracts"

// UI
import { combinationKey, type VariationsValue } from "@harness-monorepo/ui/lib/variations"
import { defaultMessages } from "@harness-monorepo/ui/locales/index"

// App
import { EMPTY_FORM } from "./product-form-mapping"
import { optionsPayloadOf, rekeyDraft, toVariationsDraft, variantsPayloadOf, variationIssuesOf } from "./variations-mapping"

const base = { isActive: true, price: "189,00", stock: "", sku: "", weight: "" }

function detail(over: Partial<ProductDetail>): ProductDetail {
  return { id: "p1", options: [], variants: [], ...over } as unknown as ProductDetail
}

const variant = (id: string, optionValueIds: string[], over: object = {}) => ({
  id,
  optionValueIds,
  isActive: true,
  priceCents: 18900,
  compareAtPriceCents: null,
  costCents: null,
  sku: null,
  barcode: null,
  trackStock: false,
  stockQuantity: null,
  weightGrams: null,
  lengthMm: null,
  widthMm: null,
  heightMm: null,
  imageUrl: null,
  ...over,
})

describe("the variations draft of a saved product", () => {
  it("keys options and values by their ids and rows by their combination", () => {
    const draft = toVariationsDraft(
      detail({
        options: [{ id: "size", name: "Tamanho", values: [{ id: "P", name: "P", colorHex: null }] }],
        variants: [variant("v1", ["P"], { sku: "BLS-P", stockQuantity: 3 })],
      }),
      defaultMessages,
    )

    expect(draft.options[0]).toMatchObject({ key: "size", isColor: false, values: [{ key: "P" }] })
    expect(draft.rows.P).toEqual({ isActive: true, price: "189,00", stock: "3", sku: "BLS-P", weight: "" })
  })

  it("has no options and no rows for a product that sells one thing", () => {
    expect(toVariationsDraft(detail({ variants: [variant("v1", [])] }), defaultMessages)).toEqual({ options: [], rows: {} })
  })

  it("keeps a colour option a colour one when it was saved before any swatch was picked", () => {
    const draft = toVariationsDraft(
      detail({ options: [{ id: "c", name: " cor ", values: [{ id: "a", name: "Areia", colorHex: null }] }], variants: [variant("v1", ["a"])] }),
      defaultMessages,
    )

    expect(draft.options[0]?.isColor).toBe(true)
  })
})

describe("what the save sends", () => {
  const draft: VariationsValue = {
    options: [
      {
        key: "size",
        name: " Tamanho ",
        isColor: false,
        values: [
          { key: "P", name: "P", colorHex: null },
          { key: "new:m", name: "M", colorHex: null },
        ],
      },
      { key: "new:empty", name: "Cor", isColor: true, values: [] },
    ],
    rows: {
      P: { isActive: true, price: "189,00", stock: "4", sku: "BLS-P", weight: "900" },
      "new:m": { isActive: false, price: "199,00", stock: "", sku: "", weight: "750" },
    },
  }

  it("sends only options with values, with ids only for what the API has seen", () => {
    expect(optionsPayloadOf(draft)).toEqual({
      options: [{ id: "size", name: "Tamanho", values: [{ id: "P", name: "P", colorHex: null }, { name: "M", colorHex: null }] }],
    })
  })

  it("matches a new value to the id it was given by its place, and sends every row", () => {
    const saved = detail({
      options: [
        {
          id: "size",
          name: "Tamanho",
          values: [
            { id: "P", name: "P", colorHex: null },
            { id: "M-id", name: "M", colorHex: null },
          ],
        },
      ],
      variants: [variant("v1", ["P"]), variant("v2", ["M-id"])],
    })

    // The product's own weight field is ignored: each combination sends its own; the box is shared.
    const payload = variantsPayloadOf(draft, saved, base, { ...EMPTY_FORM, trackStock: true, weight: "300", length: "10", width: "10", height: "20" })

    expect(payload).toEqual([
      { id: "v1", isActive: true, priceCents: 18900, sku: "BLS-P", trackStock: true, stockQuantity: 4, weightGrams: 900, lengthMm: 100, widthMm: 100, heightMm: 200 },
      { id: "v2", isActive: false, priceCents: 19900, sku: null, trackStock: true, stockQuantity: null, weightGrams: 750, lengthMm: 100, widthMm: 100, heightMm: 200 },
    ])
  })

  it("sends a row switched off without a price, so its switch is saved", () => {
    const saved = detail({
      options: [{ id: "size", name: "Tamanho", values: [{ id: "P", name: "P", colorHex: null }, { id: "M-id", name: "M", colorHex: null }] }],
      variants: [variant("v1", ["P"]), variant("v2", ["M-id"])],
    })
    const off = { ...draft, rows: { ...draft.rows, "new:m": { isActive: false, price: "", stock: "", sku: "", weight: "" } } }

    const payload = variantsPayloadOf(off, saved, base, EMPTY_FORM)

    expect(payload[1]).toMatchObject({ id: "v2", isActive: false })
    expect(payload[1]).not.toHaveProperty("priceCents")
  })

  it("drops a \"was\" price inherited from the product that the row's price has reached", () => {
    const saved = detail({
      options: [{ id: "size", name: "Tamanho", values: [{ id: "P", name: "P", colorHex: null }, { id: "M-id", name: "M", colorHex: null }] }],
      variants: [variant("v1", ["P"], { compareAtPriceCents: 18000 }), variant("v2", ["M-id"], { compareAtPriceCents: 25000 })],
    })

    const payload = variantsPayloadOf(draft, saved, base, EMPTY_FORM)

    expect(payload[0]).toMatchObject({ priceCents: 18900, compareAtPriceCents: null })
    // A "was" price still above the row's price is a real discount, and is left alone.
    expect(payload[1]).toMatchObject({ priceCents: 19900 })
    expect(payload[1]).not.toHaveProperty("compareAtPriceCents")
  })

  it("renames new keys to the ids a partial save gave them, rows included", () => {
    const saved = detail({
      options: [{ id: "size", name: "Tamanho", values: [{ id: "P", name: "P", colorHex: null }, { id: "M-id", name: "M", colorHex: null }] }],
    })

    const rekeyed = rekeyDraft(draft, saved)

    expect(rekeyed.options[0]?.values.map((value) => value.key)).toEqual(["P", "M-id"])
    expect(rekeyed.rows["M-id"]).toEqual(draft.rows["new:m"])
    expect(rekeyed.options[1]?.key).toBe("new:empty")
  })

  it("stops a save with a nameless option, an option without values, or a row on sale without a price", () => {
    const issues = variationIssuesOf(
      {
        options: [
          { key: "a", name: "", isColor: false, values: [{ key: "x", name: "X", colorHex: null }] },
          { key: "b", name: "Cor", isColor: true, values: [] },
        ],
        rows: { [combinationKey(["x"])]: { isActive: true, price: "", stock: "", sku: "", weight: "" } },
      },
      { ...base, price: "" },
      defaultMessages,
    )

    expect(issues.blocked).toBe(true)
    expect(issues.options).toEqual({ a: "Dê um nome para a opção.", b: "Adicione pelo menos um valor." })
    expect(issues.rows.x).toBe("Informe o preço de X.")
  })
})
