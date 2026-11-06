// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PublicComponent } from "@harness-monorepo/contracts"

// App
import { seeAllHrefOf } from "./storefront-shelf"

const routes = {
  category: (slug: string) => `/dindin-da-leia/categorias/${slug}`,
  catalog: () => "/dindin-da-leia/produtos",
} as Parameters<typeof seeAllHrefOf>[1]

const showcase = (over: Partial<PublicComponent>) => ({ kind: "PRODUCTS", sourceCategory: null, ...over }) as PublicComponent

describe("seeAllHrefOf — a showcase's \"ver tudo\"", () => {
  it("leads to the category, or the whole catalogue, while there is more there than the shelf draws", () => {
    expect(seeAllHrefOf(showcase({ moreToSee: true, sourceCategory: { slug: "picoles", name: "Picolés", description: null } }), routes)).toBe("/dindin-da-leia/categorias/picoles")
    expect(seeAllHrefOf(showcase({ moreToSee: true }), routes)).toBe("/dindin-da-leia/produtos")
  })

  it("is not drawn when the shelf already shows everything there is", () => {
    expect(seeAllHrefOf(showcase({ moreToSee: false }), routes)).toBeUndefined()
  })

  it("stays on a page cached before the API told", () => {
    expect(seeAllHrefOf(showcase({}), routes)).toBe("/dindin-da-leia/produtos")
  })
})
