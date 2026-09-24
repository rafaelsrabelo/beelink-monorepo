// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { PublicProductCategory, PublicStore, StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import * as data from "./storefront-data"
import * as locale from "./locale"
import { storefrontRoutes } from "./storefront-routes"
import { LISTING_PAGE_SIZE, canonicalOf, headingOf, isShelf, listingAskOf, pageHrefOf, placeOf, subtitleOf } from "./storefront-section"

const store = {
  slug: "loja",
  name: "Loja",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho" },
} as unknown as PublicStore

const category = (slug: string, parentSlug: string | null = null) =>
  ({ id: slug, slug, name: slug.toUpperCase(), description: null, imageUrl: null, parentSlug }) as unknown as PublicProductCategory

const routes = storefrontRoutes(store)

function arrange(categories: PublicProductCategory[] = [category("proteinas"), category("whey", "proteinas")]) {
  vi.spyOn(data, "shopAt").mockResolvedValue(store)
  vi.spyOn(data, "navigationAt").mockResolvedValue({ categories, onSale: true })
  vi.spyOn(locale, "getMessages").mockResolvedValue({ ui: ptBR } as Awaited<ReturnType<typeof locale.getMessages>>)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("placeOf", () => {
  it("is null — a 404 — for a shop that does not exist, or a category the shop does not have", async () => {
    arrange()
    vi.spyOn(data, "shopAt").mockResolvedValueOnce(null)

    expect(await placeOf("nada", "produtos", {})).toBeNull()
    expect(await placeOf("loja", "qualquer-coisa", {})).toBeNull()
  })

  it("finds a category and the shelf it sits on, from the navigation alone", async () => {
    arrange()

    const place = await placeOf("loja", "whey", { pagina: "2", ordenar: "menor-preco" })

    expect(place?.category?.slug).toBe("whey")
    expect(place?.parentCategory?.slug).toBe("proteinas")
    expect(place?.page).toBe(2)
    expect(place?.filters.sort).toBe("menor-preco")
    expect(vi.mocked(data.navigationAt)).toHaveBeenCalledWith("loja")
  })

  it("reads the narrowing of a search, never of a category's own page", async () => {
    arrange()

    expect((await placeOf("loja", "busca", { q: "whey", categoria: "proteinas" }))?.scope).toBe("proteinas")
    expect((await placeOf("loja", "whey", { categoria: "proteinas" }))?.scope).toBeUndefined()
  })
})

describe("the section's helpers", () => {
  it("ask the catalogue for one page of the grid, in the section's own terms", async () => {
    arrange()

    const search = (await placeOf("loja", "busca", { q: "whey", categoria: "proteinas" }))!
    const inCategory = (await placeOf("loja", "whey", {}))!

    expect(listingAskOf(search)).toMatchObject({ search: "whey", category: "proteinas", pageSize: LISTING_PAGE_SIZE })
    expect(listingAskOf(inCategory)).toMatchObject({ category: "whey", page: 1 })
    expect(listingAskOf(inCategory)).not.toHaveProperty("search")
  })

  it("tell a shelf from the pages that draw no products", async () => {
    arrange()

    expect(isShelf((await placeOf("loja", "produtos", {}))!)).toBe(true)
    expect(isShelf((await placeOf("loja", "categorias", {}))!)).toBe(false)
    expect(isShelf((await placeOf("loja", "carrinho", {}))!)).toBe(false)
  })

  it("title, count and canonical each section as before", async () => {
    arrange()

    const catalog = (await placeOf("loja", "produtos", { pagina: "3" }))!
    const search = (await placeOf("loja", "busca", { q: "whey" }))!
    const inCategory = (await placeOf("loja", "whey", {}))!
    const total = (count: number) => ({ total: count }) as Pick<StorefrontCatalog, "total">

    expect(headingOf(inCategory)).toBe("WHEY")
    expect(subtitleOf(catalog, total(1), "pt-BR")).toBe(ptBR.storefront.productCountOne)
    expect(subtitleOf(search, total(0), "pt-BR")).toContain("whey")
    expect(canonicalOf(catalog, routes)).toBe("/loja/produtos")
    expect(canonicalOf(inCategory, routes)).toBe("/loja/whey")
  })

  it("page each shelf on its own address, keeping its filters", async () => {
    arrange()

    const inCategory = (await placeOf("loja", "whey", { ordenar: "menor-preco" }))!
    const search = (await placeOf("loja", "busca", { q: "whey", categoria: "proteinas" }))!

    expect(pageHrefOf(inCategory, routes)(2)).toBe("/loja/whey?pagina=2&ordenar=menor-preco")
    expect(pageHrefOf(search, routes)(2)).toBe("/loja/busca?q=whey&categoria=proteinas&pagina=2")
  })
})
