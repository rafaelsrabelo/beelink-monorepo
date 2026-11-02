// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { fetchAllProducts, reorderProducts } from "./catalog-requests"

afterEach(() => vi.unstubAllGlobals())

const product = (id: string) => ({ id })

function answering(pages: Record<string, { products: { id: string }[]; total: number; pageSize: number }>) {
  const fetchSpy = vi.fn(async (url: string) => {
    const page = new URL(url, "http://x.invalid").searchParams.get("page") ?? "1"
    return Response.json({ page: Number(page), carrierGaps: null, ...pages[page] })
  })
  vi.stubGlobal("fetch", fetchSpy)
  return fetchSpy
}

describe("fetchAllProducts", () => {
  it("walks every page of the shop, by the page size the API says it applied", async () => {
    const fetchSpy = answering({
      "1": { products: [product("a"), product("b")], total: 3, pageSize: 2 },
      "2": { products: [product("c")], total: 3, pageSize: 2 },
    })

    expect((await fetchAllProducts("loja")).map((row) => row.id)).toEqual(["a", "b", "c"])
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it("counts a product once when a write shows it on two pages", async () => {
    answering({
      "1": { products: [product("a"), product("b")], total: 4, pageSize: 2 },
      "2": { products: [product("b"), product("c")], total: 4, pageSize: 2 },
    })

    expect((await fetchAllProducts("loja")).map((row) => row.id)).toEqual(["a", "b", "c"])
  })

  it("stops at an empty page, whatever the total said", async () => {
    const fetchSpy = answering({
      "1": { products: [product("a")], total: 9, pageSize: 1 },
      "2": { products: [], total: 9, pageSize: 1 },
    })

    expect((await fetchAllProducts("loja")).map((row) => row.id)).toEqual(["a"])
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})

describe("reorderProducts", () => {
  it("sends the whole list and throws the API's code on a refusal", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ errorCode: "CATALOG_REORDER_MISMATCH" }, { status: 409 }))
    vi.stubGlobal("fetch", fetchSpy)

    await expect(reorderProducts("loja", ["b", "a"])).rejects.toMatchObject({ errorCode: "CATALOG_REORDER_MISMATCH" })
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/stores/loja/products/reorder",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ ids: ["b", "a"] }) }),
    )
  })
})
