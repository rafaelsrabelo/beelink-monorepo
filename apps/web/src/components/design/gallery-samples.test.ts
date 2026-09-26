// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PublicProductCard, PublicStore } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import type { Shelves } from "./design-draft-preview"
import { previewable, sampleSectionOf, stockOf, type GalleryStock } from "./gallery-samples"

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
const NOW = Date.parse("2026-09-26T12:00:00Z")
const stock = stockOf(store, shelves, 2, NOW)
const empty: GalleryStock = { images: [], products: [], hasCategories: false, now: NOW }

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

  // What is chosen is what arrives: a new showcase opens as a rail, in a contained band.
  it("fills a showcase with the shop's products, laid out as a new one opens", () => {
    const band = sampleSectionOf({ kind: "PRODUCTS", across: 1, name: "", hint: "" }, stock, ptBR)

    expect(band).toMatchObject({ width: "CONTAINED", components: [{ display: "RAIL" }] })
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
  })

  // The form's own first question is the name; the sample asks what a new form asks after it.
  it("draws the contact form a new one opens with, never asking the name twice", () => {
    const fields = sampleSectionOf({ kind: "CONTACT", across: 1, name: "", hint: "" }, empty, ptBR)?.components[0]?.items as { type: string }[]

    expect(fields.map((field) => field.type)).toEqual(["EMAIL", "PHONE", "TEXTAREA"])
  })

  it("draws a FAQ with sample questions, as the accordion a new one opens as", () => {
    const faq = sampleSectionOf({ kind: "FAQ", across: 1, name: "", hint: "" }, empty, ptBR)?.components[0]

    expect(faq).toMatchObject({ kind: "FAQ", display: "ACCORDION", title: "Perguntas frequentes" })
    expect(faq?.items).toHaveLength(3)
  })

  it("draws a call to action as the strip a new one opens as, its button drawn", () => {
    const cta = sampleSectionOf({ kind: "CALL_TO_ACTION", across: 1, name: "", hint: "" }, empty, ptBR)?.components[0]

    expect(cta).toMatchObject({ kind: "CALL_TO_ACTION", display: "BAND", title: "Pronto para escolher o seu?" })
    expect(cta?.items).toEqual([expect.objectContaining({ label: "Ver produtos" })])
  })

  it("draws an image with text with the shop's picture, and its words alone without one", () => {
    const words = sampleSectionOf({ kind: "IMAGE_TEXT", across: 1, name: "", hint: "" }, empty, ptBR)?.components[0]
    expect(words).toMatchObject({ kind: "IMAGE_TEXT", display: "IMAGE_LEFT", title: "Feito com cuidado", items: [] })

    const pictured = sampleSectionOf({ kind: "IMAGE_TEXT", across: 1, name: "", hint: "" }, { ...empty, images: ["/a.jpg"] }, ptBR)
    expect(pictured?.components[0]?.items).toEqual([expect.objectContaining({ imageUrl: "/a.jpg" })])
  })

  it("features the shop's first product, and keeps the wireframe for a shop with none", () => {
    const product = { id: "p", slug: "whey", name: "Whey", priceCents: 100, compareAtPriceCents: null, imageUrl: null, categorySlug: null, priceRange: { minCents: 100, maxCents: 100 } }
    const featured = sampleSectionOf({ kind: "FEATURED_PRODUCT", across: 1, name: "", hint: "" }, { ...empty, products: [product] }, ptBR)

    expect(featured?.components[0]).toMatchObject({ kind: "FEATURED_PRODUCT", display: "IMAGE_LEFT", items: [{ name: "Whey", soldOut: false }] })
    expect(sampleSectionOf({ kind: "FEATURED_PRODUCT", across: 1, name: "", hint: "" }, empty, ptBR)).toBeNull()
  })

  it("counts a sample countdown down from when the gallery opened, on a strip", () => {
    const countdown = sampleSectionOf({ kind: "COUNTDOWN", across: 1, name: "", hint: "" }, empty, ptBR)?.components[0]

    expect(countdown).toMatchObject({ kind: "COUNTDOWN", display: "BAND", title: "A oferta termina em" })
    expect(Date.parse((countdown?.items[0] as { endsAt: string }).endsAt)).toBeGreaterThan(NOW + 2 * 86_400_000)
  })

  it("tells a card that has a preview from one that keeps its wireframe", () => {
    expect(previewable({ kind: "BANNER", across: 1, name: "", hint: "" }, empty, ptBR)).toBe(false)
    expect(previewable({ kind: "BANNER", across: 1, name: "", hint: "" }, stock, ptBR)).toBe(true)
    expect(previewable({ kind: "ANNOUNCEMENT", across: 1, name: "", hint: "" }, empty, ptBR)).toBe(true)
  })
})
