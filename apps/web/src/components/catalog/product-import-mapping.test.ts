// Libs
import { describe, expect, it } from "vitest"

// UI
import { NEW_CATEGORY } from "@harness-monorepo/ui/blocks/catalog/product-import-review"

// Types
import type { ProductImportDraft } from "@harness-monorepo/contracts"

// App
import { payloadFrom, rowsFrom } from "./product-import-mapping"

const picoles = { id: "0199a0f1-0000-7000-8000-0000000000c1", name: "Picolés" }

const drafts: ProductImportDraft[] = [
  { name: "Picolé de uva", description: null, priceCents: 500, categoryName: "PICOLES", option: null },
  {
    name: "Dindin gourmet",
    description: "Feito com leite.",
    priceCents: 400,
    categoryName: "Dindins",
    option: { name: "Sabor", values: [{ name: "Coco", priceCents: null }, { name: "Nutella", priceCents: 650 }] },
  },
  { name: "Suco de cajá", description: null, priceCents: null, categoryName: null, option: null },
]

describe("rowsFrom", () => {
  it("matches a category by name however it is spelled, and offers to create the ones the shop lacks", () => {
    const [uva, gourmet, suco] = rowsFrom(drafts, [picoles])

    expect(uva).toMatchObject({ categoryId: picoles.id, newCategoryName: null, price: "5,00", include: true })
    expect(gourmet).toMatchObject({ categoryId: NEW_CATEGORY, newCategoryName: "Dindins", price: "4,00" })
    expect(suco).toMatchObject({ categoryId: "", newCategoryName: null, price: "" })
  })
})

describe("payloadFrom", () => {
  it("sends the ticked rows, each with its category and its option", () => {
    const rows = rowsFrom(drafts, [picoles]).map((row) => (row.price === "" ? { ...row, include: false } : row))

    expect(payloadFrom(rows)).toEqual({
      products: [
        { name: "Picolé de uva", description: null, priceCents: 500, categoryId: picoles.id, option: null },
        {
          name: "Dindin gourmet",
          description: "Feito com leite.",
          priceCents: 400,
          newCategoryName: "Dindins",
          option: { name: "Sabor", values: [{ name: "Coco", priceCents: null }, { name: "Nutella", priceCents: 650 }] },
        },
      ],
    })
  })

  it("reads the price as typed, and sends nothing while a ticked row has none", () => {
    const rows = rowsFrom(drafts, [picoles])

    expect(payloadFrom(rows)).toBeNull()
    expect(payloadFrom(rows.map((row) => (row.price === "" ? { ...row, price: "R$ 7,5" } : row)))?.products[2]?.priceCents).toBe(750)
  })

  it("sends nothing when nothing is ticked", () => {
    expect(payloadFrom(rowsFrom(drafts, []).map((row) => ({ ...row, include: false })))).toBeNull()
  })
})
