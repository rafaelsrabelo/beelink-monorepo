// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { PublicProductCategory, StorefrontCatalog } from "@harness-monorepo/contracts"

// App
import { catalogTag, storeTag } from "./revalidate"
import { categoriesAt, shopAt } from "./storefront-data"

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
    facets: { categories: [], options: [], discount: { count: 0, selected: false }, price: null },
    applied: [],
    ...over,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("categoriesAt — the menu and the categories block", () => {
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
