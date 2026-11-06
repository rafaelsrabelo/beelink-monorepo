// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Product } from "@harness-monorepo/contracts"

// App
import { productTableItemOf } from "./product-table-items"

const product = {
  id: "p1",
  slug: "dindin-de-coco",
  name: "Dindin de coco",
  sku: null,
  priceCents: 400,
  compareAtPriceCents: null,
  images: [],
  category: { id: "c1", name: "Dindin" },
  status: "ACTIVE",
  soldOut: false,
  origin: null,
  trackStock: false,
  stockQuantity: null,
  cashbackRateBps: null,
} as unknown as Product

const context = {
  categoryNames: new Map([["c1", "Dindins"]]),
  pageOf: (slug: string) => `/dindin-da-leia/produtos/${slug}`,
  carrierGaps: { p1: "NO_WEIGHT" as const },
}

describe("productTableItemOf", () => {
  it("names the category as the categories screen does, and opens the product's own page", () => {
    expect(productTableItemOf(product, context)).toMatchObject({
      categoryName: "Dindins",
      viewHref: "/dindin-da-leia/produtos/dindin-de-coco",
      imageUrl: null,
      carrierGap: "NO_WEIGHT",
    })
  })

  it("points the eye at nothing for a draft, or before the shop is read", () => {
    expect(productTableItemOf({ ...product, status: "DRAFT" }, context).viewHref).toBeNull()
    expect(productTableItemOf(product, { ...context, pageOf: null }).viewHref).toBeNull()
  })
})
