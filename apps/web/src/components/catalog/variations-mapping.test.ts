// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ProductDetail } from "@harness-monorepo/contracts"

// UI
import { combinationKey, type VariationsValue } from "@harness-monorepo/ui/lib/variations"
import { defaultMessages } from "@harness-monorepo/ui/locales/index"

// App
import { EMPTY_FORM } from "./product-form-mapping"
import { optionsPayloadOf, toVariationsDraft, variantsPayloadOf, variationIssuesOf } from "./variations-mapping"

const base = { isActive: true, price: "189,00", stock: "", sku: "" }

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
    )

    expect(draft.options[0]).toMatchObject({ key: "size", isColor: false, values: [{ key: "P" }] })
    expect(draft.rows.P).toEqual({ isActive: true, price: "189,00", stock: "3", sku: "BLS-P" })
  })

  it("has no options and no rows for a product that sells one thing", () => {
    expect(toVariationsDraft(detail({ variants: [variant("v1", [])] }))).toEqual({ options: [], rows: {} })
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
    rows: { P: { isActive: true, price: "189,00", stock: "4", sku: "BLS-P" }, "new:m": { isActive: false, price: "199,00", stock: "", sku: "" } },
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

    const payload = variantsPayloadOf(draft, saved, base, { ...EMPTY_FORM, trackStock: true, weight: "300" })

    expect(payload).toEqual([
      { id: "v1", isActive: true, priceCents: 18900, sku: "BLS-P", trackStock: true, stockQuantity: 4, weightGrams: 300, lengthMm: null, widthMm: null, heightMm: null },
      { id: "v2", isActive: false, priceCents: 19900, sku: null, trackStock: true, stockQuantity: null, weightGrams: 300, lengthMm: null, widthMm: null, heightMm: null },
    ])
  })

  it("stops a save with a nameless option, an option without values, or a row on sale without a price", () => {
    const issues = variationIssuesOf(
      {
        options: [
          { key: "a", name: "", isColor: false, values: [{ key: "x", name: "X", colorHex: null }] },
          { key: "b", name: "Cor", isColor: true, values: [] },
        ],
        rows: { [combinationKey(["x"])]: { isActive: true, price: "", stock: "", sku: "" } },
      },
      { ...base, price: "" },
      defaultMessages,
    )

    expect(issues.blocked).toBe(true)
    expect(issues.options).toEqual({ a: "Dê um nome para a opção.", b: "Adicione pelo menos um valor." })
    expect(issues.rows.x).toBe("Informe o preço de X.")
  })
})
