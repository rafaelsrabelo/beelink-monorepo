// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ProductCategory } from "@harness-monorepo/contracts"

// App
import { categoryToForm, categoryToPayload, EMPTY_CATEGORY } from "./category-form-values"

const category: ProductCategory = {
  id: "c1",
  slug: "ferramentas",
  name: "Ferramentas",
  description: null,
  imageUrl: "https://cdn.example/card.png",
  bannerUrl: "https://cdn.example/banner.png",
  parentSlug: null,
  productCount: 3,
  position: 0,
  isActive: true,
  createdAt: "2026-10-07T00:00:00.000Z",
  updatedAt: "2026-10-07T00:00:00.000Z",
}

describe("category-form-values — the wire and the form", () => {
  it("opens the form with the category's banner beside its card image", () => {
    expect(categoryToForm(category, "")).toMatchObject({ imageUrl: "https://cdn.example/card.png", bannerUrl: "https://cdn.example/banner.png" })
    expect(categoryToForm({ ...category, bannerUrl: null }, "p1")).toMatchObject({ bannerUrl: "", parentId: "p1" })
  })

  it("sends the banner as saved, and null once the field is cleared", () => {
    const held = categoryToForm(category, "")

    expect(categoryToPayload(held).bannerUrl).toBe("https://cdn.example/banner.png")
    // Null and not left out: an update that omits the key leaves the column alone.
    expect(categoryToPayload({ ...held, bannerUrl: "" })).toMatchObject({ bannerUrl: null, imageUrl: "https://cdn.example/card.png" })
    expect(categoryToPayload({ ...EMPTY_CATEGORY, name: " Tintas " })).toMatchObject({ name: "Tintas", bannerUrl: null, imageUrl: null, slug: undefined })
  })
})
