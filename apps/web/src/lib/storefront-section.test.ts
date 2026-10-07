// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { PublicProductCategory, PublicStore } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import * as data from "./storefront-data"
import * as locale from "./locale"
import { storefrontRoutes } from "./storefront-routes"
import { LISTING_PAGE_SIZE, bannerOf, canonicalOf, headingOf, isShelf, listingAskOf, pageHrefOf, placeOf, sortFormOf, sortOptionsOf } from "./storefront-section"

const store = {
  slug: "loja",
  name: "Loja",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
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

  // A 404 tells a crawler the page is gone; an outage must not.
  it("throws — a server error — when the menu could not be read, rather than calling a category missing", async () => {
    arrange()
    vi.spyOn(data, "navigationAt").mockResolvedValue({ categories: [], onSale: false, failed: true })

    await expect(placeOf("loja", "whey", {})).rejects.toThrow()
    expect(await placeOf("loja", "produtos", {})).not.toBeNull()
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

// BEELINK-307: a category's page opens with a banner of its own.
describe("bannerOf — the banner a category's page opens with", () => {
  const withBanner = (slug: string, bannerUrl: string | null, parentSlug: string | null = null) => ({ ...category(slug, parentSlug), bannerUrl })

  it("is the category's own", async () => {
    arrange([withBanner("proteinas", "https://cdn.example/proteinas.png"), withBanner("whey", "https://cdn.example/whey.png", "proteinas")])

    expect(bannerOf((await placeOf("loja", "proteinas", {}))!)).toBe("https://cdn.example/proteinas.png")
    expect(bannerOf((await placeOf("loja", "whey", {}))!)).toBe("https://cdn.example/whey.png")
  })

  it("is the parent's for a subcategory with none of its own", async () => {
    arrange([withBanner("proteinas", "https://cdn.example/proteinas.png"), withBanner("whey", null, "proteinas")])

    expect(bannerOf((await placeOf("loja", "whey", {}))!)).toBe("https://cdn.example/proteinas.png")
  })

  it("is none for a top-level category with none, and for a subcategory whose parent has none or is hidden", async () => {
    arrange([withBanner("proteinas", null), withBanner("whey", null, "proteinas"), withBanner("orfa", null, "escondida")])

    expect(bannerOf((await placeOf("loja", "proteinas", {}))!)).toBeNull()
    expect(bannerOf((await placeOf("loja", "whey", {}))!)).toBeNull()
    expect(bannerOf((await placeOf("loja", "orfa", {}))!)).toBeNull()
  })

  // Only a category's own page: the search and "all products" draw none, even narrowed to that category.
  it("is none on the search and on the whole catalogue, even narrowed to a category that has one", async () => {
    arrange([withBanner("proteinas", "https://cdn.example/proteinas.png")])

    expect(bannerOf((await placeOf("loja", "produtos", {}))!)).toBeNull()
    expect(bannerOf((await placeOf("loja", "produtos", { categoria: "proteinas" }))!)).toBeNull()
    expect(bannerOf((await placeOf("loja", "busca", { q: "whey", categoria: "proteinas" }))!)).toBeNull()
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

  it("title and canonical each section; a search narrowed to a category takes its name", async () => {
    arrange()

    const catalog = (await placeOf("loja", "produtos", { pagina: "3" }))!
    const inCategory = (await placeOf("loja", "whey", {}))!

    expect(headingOf(inCategory)).toBe("WHEY")
    expect(headingOf((await placeOf("loja", "busca", { q: "whey", categoria: "proteinas" }))!)).toBe("PROTEINAS")
    expect(headingOf((await placeOf("loja", "busca", { q: "whey" }))!)).toBe(ptBR.storefront.searchHeading)
    expect(canonicalOf(catalog, routes)).toBe("/loja/produtos")
    expect(canonicalOf(inCategory, routes)).toBe("/loja/whey")
  })

  it("sort on the shelf's own address, keeping every filter but the order and the page", async () => {
    arrange()

    const search = (await placeOf("loja", "busca", { q: "whey", categoria: "proteinas", ordenar: "menor-preco", pagina: "4", precoMin: "50" }))!
    const form = sortFormOf(search, routes)

    expect(form.action).toBe("/loja/busca")
    expect(form.value).toBe("menor-preco")
    expect(form.fields).toEqual([
      ["q", "whey"],
      ["categoria", "proteinas"],
      ["precoMin", "50"],
    ])
    expect(sortFormOf((await placeOf("loja", "produtos", {}))!, routes).value).toBe("relevancia")
    expect(sortOptionsOf(search).map((option) => option.value)).toEqual(["relevancia", "menor-preco", "maior-preco", "maior-desconto", "novidades"])
  })

  it("page each shelf on its own address, keeping its filters", async () => {
    arrange()

    const inCategory = (await placeOf("loja", "whey", { ordenar: "menor-preco" }))!
    const search = (await placeOf("loja", "busca", { q: "whey", categoria: "proteinas" }))!

    expect(pageHrefOf(inCategory, routes)(2)).toBe("/loja/whey?pagina=2&ordenar=menor-preco")
    expect(pageHrefOf(search, routes)(2)).toBe("/loja/busca?q=whey&categoria=proteinas&pagina=2")
  })
})
