// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { CatalogFacetValue, PublicProductCategory, PublicStore, StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import * as data from "./storefront-data"
import * as locale from "./locale"
import { categoryFilterOf, clearFiltersHrefOf, discountFilterOf, filterChipsOf, optionFiltersOf } from "./storefront-filters"
import { storefrontRoutes } from "./storefront-routes"
import { placeOf } from "./storefront-section"

const store = {
  slug: "loja",
  name: "Loja",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho" },
} as unknown as PublicStore

const category = (slug: string, parentSlug: string | null = null) =>
  ({ id: slug, slug, name: slug.toUpperCase(), description: null, imageUrl: null, parentSlug }) as unknown as PublicProductCategory

const facet = (value: string, count: number) => ({ value, label: value, count, available: count > 0, selected: false, colorHex: null }) satisfies CatalogFacetValue

const routes = storefrontRoutes(store)
const catalogue = {
  facets: { categories: [facet("pre-treino", 86), facet("pote", 38), facet("dose-unica", 0), facet("whey", 24), facet("vazia", 0)] },
} as unknown as Pick<StorefrontCatalog, "facets">

function arrange() {
  vi.spyOn(data, "shopAt").mockResolvedValue(store)
  vi.spyOn(data, "navigationAt").mockResolvedValue({
    categories: [category("pre-treino"), category("pote", "pre-treino"), category("dose-unica", "pre-treino"), category("whey"), category("vazia")],
    onSale: true,
  })
  vi.spyOn(locale, "getMessages").mockResolvedValue({ ui: ptBR } as Awaited<ReturnType<typeof locale.getMessages>>)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("filterChipsOf", () => {
  it("makes one chip of a price range, reads a sale and an option as a shopper would, and keeps the order", async () => {
    arrange()
    const place = (await placeOf("loja", "produtos", { precoMin: "100", precoMax: "200", desconto: "1", opcao: ["Peso:300 g", "Sabor:Uva"], ordenar: "menor-preco", pagina: "3" }))!

    const chips = filterChipsOf(place, routes, "pt-BR")

    expect(chips.map((chip) => chip.label.replace(/\s/g, " "))).toEqual(["R$ 100 a R$ 200", "Em promoção", "300 g", "Uva"])
    expect(chips[0]?.href).toBe("/loja/produtos?ordenar=menor-preco&desconto=1&opcao=Peso%3A300+g&opcao=Sabor%3AUva")
    expect(chips[2]?.href).toBe("/loja/produtos?ordenar=menor-preco&precoMin=100&precoMax=200&desconto=1&opcao=Sabor%3AUva")
  })

  it("says a one-sided price and a minimum cut in words", async () => {
    arrange()

    const upTo = filterChipsOf((await placeOf("loja", "produtos", { precoMax: "50" }))!, routes, "pt-BR")
    const from = filterChipsOf((await placeOf("loja", "produtos", { precoMin: "200", desconto: "20" }))!, routes, "pt-BR")

    expect(upTo[0]?.label.replace(/\s/g, " ")).toBe("Até R$ 50")
    expect(from.map((chip) => chip.label.replace(/\s/g, " "))).toEqual(["A partir de R$ 200", "20% ou mais"])
  })

  it("never turns the route's category or the searched term into a chip", async () => {
    arrange()

    expect(filterChipsOf((await placeOf("loja", "pre-treino", {}))!, routes, "pt-BR")).toEqual([])
    expect(filterChipsOf((await placeOf("loja", "busca", { q: "whey", categoria: "whey" }))!, routes, "pt-BR")).toEqual([])
  })

  it("clears every chip but keeps the term, the search's category and the order", async () => {
    arrange()
    const place = (await placeOf("loja", "busca", { q: "whey", categoria: "whey", precoMin: "10", ordenar: "maior-preco" }))!

    expect(clearFiltersHrefOf(place, routes)).toBe("/loja/busca?q=whey&categoria=whey&ordenar=maior-preco")
  })
})

describe("categoryFilterOf", () => {
  it("on the catalogue: the first level with counts, empty ones left out, the narrowed one marked", async () => {
    arrange()

    const { entries, back, current } = categoryFilterOf((await placeOf("loja", "produtos", { categoria: "whey", precoMin: "10" }))!, catalogue, routes)

    expect(back).toBeUndefined()
    expect(current).toBeUndefined()
    expect(entries.map((entry) => [entry.slug, entry.count, entry.selected])).toEqual([
      ["pre-treino", 86, false],
      ["whey", 24, true],
    ])
    expect(entries[0]?.href).toBe("/loja/pre-treino?precoMin=10")
    expect(entries[1]?.href).toBe("/loja/produtos?precoMin=10")
  })

  it("on a search: narrowing keeps the term", async () => {
    arrange()

    const { entries } = categoryFilterOf((await placeOf("loja", "busca", { q: "pote" }))!, catalogue, routes)

    expect(entries[0]?.href).toBe("/loja/busca?q=pote&categoria=pre-treino")
  })

  it("on a category: the way back, the category and its children that still hold something", async () => {
    arrange()

    const { back, current, entries } = categoryFilterOf((await placeOf("loja", "pre-treino", {}))!, catalogue, routes)

    expect(back).toEqual({ label: "Todos os produtos", href: "/loja/produtos" })
    expect(current).toBe("PRE-TREINO")
    expect(entries.map((entry) => entry.slug)).toEqual(["pote"])
  })

  it("on a subcategory: the way up to its parent, and where it is", async () => {
    arrange()

    const filter = categoryFilterOf((await placeOf("loja", "pote", {}))!, catalogue, routes)

    expect(filter).toEqual({ back: { label: "PRE-TREINO", href: "/loja/pre-treino" }, current: "POTE", entries: [] })
  })
})

describe("optionFiltersOf", () => {
  const withOptions = {
    facets: {
      options: [
        { name: "Sabor", values: [{ ...facet("Uva", 3), selected: false }, { ...facet("Limão", 0), selected: false }, { ...facet("Coco", 0), available: false, selected: true }] },
        { name: "Cor", values: [] },
      ],
    },
  } as unknown as Pick<StorefrontCatalog, "facets">

  it("offers each value toggled on the address, leaves out empty ones unless chosen, and drops empty groups", async () => {
    arrange()
    const place = (await placeOf("loja", "produtos", { opcao: "sabor:coco", ordenar: "menor-preco" }))!

    const groups = optionFiltersOf(place, withOptions, routes)

    expect(groups.map((group) => group.title)).toEqual(["Sabor"])
    expect(groups[0]?.values.map((entry) => [entry.value, entry.selected])).toEqual([
      ["Uva", false],
      ["Coco", true],
    ])
    expect(groups[0]?.values[0]?.href).toBe("/loja/produtos?ordenar=menor-preco&opcao=sabor%3Acoco&opcao=Sabor%3AUva")
    // The address spelled it in lower case; taking it off removes what the address holds.
    expect(groups[0]?.values[1]?.href).toBe("/loja/produtos?ordenar=menor-preco")
  })
})

describe("discountFilterOf", () => {
  const onSale = {
    facets: {
      discount: {
        count: 14,
        selected: false,
        ranges: [
          { minPercent: 10, count: 12, selected: false },
          { minPercent: 20, count: 5, selected: false },
          { minPercent: 30, count: 0, selected: false },
        ],
      },
    },
  } as unknown as Pick<StorefrontCatalog, "facets">

  it("offers 'Em promoção' and the cuts that still hold something, one cut at a time", async () => {
    arrange()

    const { onSale: box, ranges } = discountFilterOf((await placeOf("loja", "produtos", { desconto: "20" }))!, onSale, routes)

    expect(box).toEqual({ href: "/loja/produtos?desconto=1", count: 14, selected: false })
    expect(ranges.map((range) => [range.percent, range.selected, range.href])).toEqual([
      [10, false, "/loja/produtos?desconto=10"],
      [20, true, "/loja/produtos"],
    ])
  })

  it("draws nothing to offer on a shelf with nothing on sale", async () => {
    arrange()
    const none = { facets: { discount: { count: 0, selected: false, ranges: [] } } } as unknown as Pick<StorefrontCatalog, "facets">

    expect(discountFilterOf((await placeOf("loja", "produtos", {}))!, none, routes)).toEqual({ onSale: null, ranges: [] })
  })
})
