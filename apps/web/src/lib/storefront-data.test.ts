// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { PublicProductCategory, StorefrontCatalog } from "@harness-monorepo/contracts"

// App
import { HOME_RAILS_MAX, HOME_RAIL_PAGE_SIZE, RAIL_PAGE_SIZE, homeAt } from "./storefront-data"

/**
 * The home's shape is the one choice on that page that decides what every visitor sees first, and
 * until this file it was the one thing nothing could assert: it lived inside an `async` Server
 * Component, and this app has no way to render one under test. That is why `homeAt` exists as a
 * function rather than as ten lines in the page body.
 *
 * The network is stubbed at `fetch` because `callPublicApi` calls it directly — the same seam the
 * route-handler tests use.
 */
function category(slug: string): PublicProductCategory {
  return {
    id: slug,
    slug,
    name: slug,
    description: null,
    imageUrl: null,
    parentSlug: null,
    showcaseLayout: null,
    productCount: 1,
  }
}

function product(slug: string) {
  return {
    id: slug,
    slug,
    name: slug,
    priceCents: 1000,
    compareAtPriceCents: null,
    imageUrl: null,
    categorySlug: null,
  }
}

/** Answers every catalogue read, and records the addresses it was asked for. */
function stubCatalogue(answer: (url: URL) => Partial<StorefrontCatalog>) {
  const asked: URL[] = []

  vi.stubGlobal("fetch", (input: string) => {
    const url = new URL(input)
    asked.push(url)

    const body: StorefrontCatalog = {
      categories: [],
      products: [],
      total: 0,
      page: 1,
      pageSize: 1,
      ...answer(url),
    }

    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
  })

  return asked
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("homeAt — one band, or one per category", () => {
  it("answers a single band of every product when the shop is not grouped", async () => {
    stubCatalogue(() => ({
      categories: [category("blusas"), category("bolsas")],
      products: [product("a"), product("b"), product("c")],
    }))

    const home = await homeAt("lessari", false)

    expect(home.bands).toHaveLength(1)
    expect(home.bands[0]).toMatchObject({ kind: "all" })
    expect(home.bands[0]?.products.map((p) => p.slug)).toEqual(["a", "b", "c"])
  })

  /**
   * The point of the whole change. Grouped, the home costs `1 + N` reads; not grouped it costs one,
   * because the catalogue endpoint answers with the categories and the products together.
   */
  it("costs one read when it is not grouped, and asks for a page worth showing", async () => {
    const asked = stubCatalogue(() => ({ categories: [category("blusas")], products: [product("a")] }))

    await homeAt("lessari", false)

    expect(asked).toHaveLength(1)
    expect(asked[0]?.searchParams.get("porPagina")).toBe(String(HOME_RAIL_PAGE_SIZE))
    expect(asked[0]?.searchParams.get("categoria")).toBeNull()
  })

  it("keeps one band per category when the shopkeeper asked for that", async () => {
    stubCatalogue((url) => {
      const asked = url.searchParams.get("categoria")

      return {
        categories: [category("blusas"), category("bolsas")],
        products: asked ? [product(`${asked}-1`)] : [],
      }
    })

    const home = await homeAt("lessari", true)

    expect(home.bands.map((band) => (band.kind === "category" ? band.category.slug : "all"))).toEqual([
      "blusas",
      "bolsas",
    ])
    expect(home.bands[0]?.products.map((p) => p.slug)).toEqual(["blusas-1"])
  })

  /** A shop with thirty categories would otherwise turn its most visited address into 31 requests. */
  it("draws no more than HOME_RAILS_MAX bands, however many categories the shop has", async () => {
    const many = Array.from({ length: HOME_RAILS_MAX + 4 }, (_unused, at) => category(`c${at}`))
    const asked = stubCatalogue(() => ({ categories: many, products: [product("a")] }))

    const home = await homeAt("lessari", true)

    expect(home.bands).toHaveLength(HOME_RAILS_MAX)
    // The index read plus one per band, and not one per category.
    expect(asked).toHaveLength(HOME_RAILS_MAX + 1)
    expect(asked.filter((url) => url.searchParams.get("categoria"))).toHaveLength(HOME_RAILS_MAX)
  })

  it("does not pay for products it will not draw on the grouped index read", async () => {
    const asked = stubCatalogue(() => ({ categories: [category("blusas")], products: [product("a")] }))

    await homeAt("lessari", true)

    expect(asked[0]?.searchParams.get("porPagina")).toBe("1")
    expect(asked[1]?.searchParams.get("porPagina")).toBe(String(RAIL_PAGE_SIZE))
  })

  /**
   * The menu and the poster band are drawn from every category the shop shows, never from the ones
   * that happened to get a band — a shop with eight categories would otherwise lose two from its
   * menu the moment the home stopped drawing them.
   */
  it("answers with every category, not only the banded ones", async () => {
    const many = Array.from({ length: HOME_RAILS_MAX + 2 }, (_unused, at) => category(`c${at}`))
    stubCatalogue(() => ({ categories: many, products: [] }))

    const home = await homeAt("lessari", true)

    expect(home.categories).toHaveLength(HOME_RAILS_MAX + 2)
  })

  /** A catalogue that will not load is an empty shelf, never a broken shop. */
  it("answers an empty band rather than throwing when the catalogue is down", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("", { status: 500 })))

    const home = await homeAt("lessari", false)

    expect(home.categories).toEqual([])
    expect(home.bands).toEqual([{ kind: "all", products: [] }])
  })
})
