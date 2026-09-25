// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { PublicProductCategory, StorefrontCatalog } from "@harness-monorepo/contracts"

// App
import { catalogTag, storeTag } from "./revalidate"
import { catalogueAt, categoriesAt, shopAt, signInOptionsAt } from "./storefront-data"

/**
 * The reads the landing is built from. The network is stubbed at `fetch` because `callPublicApi`
 * calls it directly — the same seam the route-handler tests use.
 */
function category(slug: string): PublicProductCategory {
  return {
    id: slug,
    slug,
    name: slug,
    description: null,
    imageUrl: null,
    parentSlug: null,
    productCount: 1,
  }
}

/** Answers every read, and records the address and the cache options it was asked with. */
function stubApi(answer: (url: URL) => object) {
  const asked: { url: URL; tags: string[] }[] = []

  vi.stubGlobal("fetch", (input: string, init?: { next?: { tags?: string[] } }) => {
    const url = new URL(input)
    asked.push({ url, tags: init?.next?.tags ?? [] })

    return Promise.resolve(new Response(JSON.stringify(answer(url)), { status: 200 }))
  })

  return asked
}

function catalogue(over: Partial<StorefrontCatalog>): StorefrontCatalog {
  return {
    categories: [],
    products: [],
    total: 0,
    page: 1,
    pageSize: 1,
    sort: "relevancia",
    facets: { categories: [], options: [], discount: { count: 0, selected: false, ranges: [] }, price: null },
    applied: [],
    ...over,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("categoriesAt — the menu and the categories block", () => {
  it("forwards every filter under the API's keys, opcao repeated, and never sends the shop's own order", async () => {
    const asked = stubApi(() => catalogue({}))

    await catalogueAt("lessari", {
      category: "whey",
      search: "creatina",
      page: 2,
      pageSize: 16,
      sort: "menor-preco",
      priceMin: 100,
      priceMax: 200,
      discount: true,
      options: ["Sabor:Chocolate", "Peso:900"],
    })

    const query = asked[0]!.url.searchParams
    expect(query.get("categoria")).toBe("whey")
    expect(query.get("busca")).toBe("creatina")
    expect(query.get("pagina")).toBe("2")
    expect(query.get("porPagina")).toBe("16")
    expect(query.get("ordenar")).toBe("menor-preco")
    expect(query.get("precoMin")).toBe("100")
    expect(query.get("precoMax")).toBe("200")
    expect(query.get("desconto")).toBe("1")
    expect(query.getAll("opcao")).toEqual(["Sabor:Chocolate", "Peso:900"])

    await catalogueAt("lessari", { sort: "relevancia" })
    expect(asked[1]!.url.searchParams.has("ordenar")).toBe(false)
  })

  // The API's ParseIntPipe answers 400 to "100.5", and a 400 here becomes an empty shelf.
  it("sends a price as a whole number of reais, however it arrived", async () => {
    const asked = stubApi(() => catalogue({}))

    await catalogueAt("lessari", { priceMin: 99.9, priceMax: 199.1 })

    expect(asked[0]!.url.searchParams.get("precoMin")).toBe("99")
    expect(asked[0]!.url.searchParams.get("precoMax")).toBe("200")
  })

  it("answers every category the shop shows, and pays for one product to get them", async () => {
    const many = Array.from({ length: 9 }, (_unused, at) => category(`c${at}`))
    const asked = stubApi(() => catalogue({ categories: many }))

    expect(await categoriesAt("lessari")).toHaveLength(9)
    expect(asked).toHaveLength(1)
    expect(asked[0]?.url.searchParams.get("porPagina")).toBe("1")
  })

  /** A catalogue that will not load is a shop with no menu, never a broken shop. */
  it("answers no categories rather than throwing when the catalogue is down", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("", { status: 500 })))

    expect(await categoriesAt("lessari")).toEqual([])
  })
})

describe("shopAt — the shop, its showcases' cards included", () => {
  /** The cards carry prices: a product write has to drop this read as surely as a colour change. */
  it("is cached under the shop's tag and the catalogue's", async () => {
    const asked = stubApi(() => ({ slug: "lessari" }))

    await shopAt("lessari")

    expect(asked[0]?.tags).toEqual([storeTag("lessari"), catalogTag("lessari")])
  })
})

describe("catalogueAt — a shelf that could not be read", () => {
  it("says it failed when the API broke or never answered, and is plain empty when a filter was refused", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("{}", { status: 503 })))
    expect(await catalogueAt("loja")).toMatchObject({ failed: true, products: [], total: 0 })

    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")))
    expect(await catalogueAt("loja")).toMatchObject({ failed: true })

    vi.stubGlobal("fetch", () => Promise.resolve(new Response("{}", { status: 400 })))
    expect(await catalogueAt("loja")).not.toHaveProperty("failed")
  })
})

describe("signInOptionsAt — whether the shop window offers Google", () => {
  it("says what the API says, and no Google when the API cannot answer", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(Response.json({ google: true })))
    expect(await signInOptionsAt()).toEqual({ google: true })

    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")))
    expect(await signInOptionsAt()).toEqual({ google: false })

    vi.stubGlobal("fetch", () => Promise.resolve(new Response("{}", { status: 500 })))
    expect(await signInOptionsAt()).toEqual({ google: false })
  })
})
