// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PublicProductCard, PublicStore } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import type { Shelves } from "./design-draft-preview"
import { sampleSectionOf, stockOf, type GalleryStock } from "./gallery-samples"

function product(id: string, imageUrl: string | null): PublicProductCard {
  return { id, slug: id, name: `Produto ${id}`, priceCents: 1990, compareAtPriceCents: null, imageUrl, categorySlug: null } as PublicProductCard
}

const store = {
  sections: [
    {
      id: "top",
      name: null,
      width: "FULL",
      background: null,
      components: [{ id: "cover", kind: "BANNER", items: [{ id: "s", imageUrl: "https://cdn/capa.jpg", title: null, subtitle: null, href: null, external: false }] }],
    },
  ],
} as unknown as PublicStore
const shelves: Shelves = new Map([
  ["shelf-1", { items: [product("p1", "https://cdn/p1.jpg"), product("p2", null)], sourceCategory: null }],
  ["shelf-2", { items: [product("p1", "https://cdn/p1.jpg"), product("p3", "https://cdn/p3.jpg")], sourceCategory: null }],
])
const stock = stockOf(store, shelves, 2)
const empty: GalleryStock = { images: [], products: [], hasCategories: false }

describe("stockOf — the shop's own things, for the previews", () => {
  it("takes the banners' pictures first, then the products', and each product once", () => {
    expect(stock.images).toEqual(["https://cdn/capa.jpg", "https://cdn/p1.jpg", "https://cdn/p3.jpg"])
    expect(stock.products.map((card) => card.id)).toEqual(["p1", "p2", "p3"])
    expect(stock.hasCategories).toBe(true)
  })
})

describe("sampleSectionOf — the band a card draws", () => {
  // A row of banners is a band of them, each with one of the shop's pictures.
  it("draws a row of banners with the shop's pictures, one per slice", () => {
    const band = sampleSectionOf({ kind: "BANNER", across: 3, name: "", hint: "" }, stock, ptBR)

    expect(band?.components.map((banner) => [banner.span, (banner.items[0] as { imageUrl: string }).imageUrl])).toEqual([
      ["THIRD", "https://cdn/capa.jpg"],
      ["THIRD", "https://cdn/p1.jpg"],
      ["THIRD", "https://cdn/p3.jpg"],
    ])
  })

  it("fills a showcase with the shop's products", () => {
    const band = sampleSectionOf({ kind: "PRODUCTS", across: 1, name: "", hint: "" }, stock, ptBR)

    expect(band?.components[0]?.items).toHaveLength(3)
  })

  // Nothing of its own yet: the card keeps its wireframe rather than draw an empty band.
  it("draws nothing where the shop has nothing to fill the section with", () => {
    expect(sampleSectionOf({ kind: "BANNER", across: 1, name: "", hint: "" }, empty, ptBR)).toBeNull()
    expect(sampleSectionOf({ kind: "PRODUCTS", across: 1, name: "", hint: "" }, empty, ptBR)).toBeNull()
    expect(sampleSectionOf({ kind: "CATEGORIES", across: 1, name: "", hint: "" }, empty, ptBR)).toBeNull()
  })

  it("writes sample words where a section is words", () => {
    expect(sampleSectionOf({ kind: "HEADING", across: 1, name: "", hint: "" }, empty, ptBR)?.components[0]).toMatchObject({
      title: "Novidades da semana",
    })
    expect(sampleSectionOf({ kind: "CONTACT", across: 1, name: "", hint: "" }, empty, ptBR)?.components[0]?.items).toHaveLength(3)
  })
})
