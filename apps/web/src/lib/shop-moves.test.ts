// Libs
import { describe, expect, it, vi } from "vitest"

// Types
import type { StoreSlugMove } from "@harness-monorepo/contracts"

// App
import { KEPT_COPY_FRESH_MS } from "./kept-copy"
import { createShopMoves, shopMoves } from "./shop-moves"

describe("the copy of which address a page left (BEELINK-331)", () => {
  it("says the address a page has now for one it left, and nothing for any other", async () => {
    const moves = await createShopMoves(async () => [{ from: "padaria-do-bairo", to: "padaria-do-bairro" }])()

    expect(moves.currentOf("padaria-do-bairo")).toBe("padaria-do-bairro")
    expect(moves.currentOf("padaria-do-bairro")).toBeNull()
    expect(moves.currentOf("outra")).toBeNull()
  })

  it("drops a row that is not one — no slug, or leading to itself — and keeps the rest", async () => {
    const rows = [{ from: "a-b", to: "c-d" }, { from: "../admin", to: "x" }, { from: "e", to: "e" }, { from: 1, to: "f" }, null] as unknown as StoreSlugMove[]
    const moves = await createShopMoves(async () => rows)()

    expect(moves.currentOf("a-b")).toBe("c-d")
    expect(moves.currentOf("../admin")).toBeNull()
    expect(moves.currentOf("e")).toBeNull()
  })

  it("is read once a minute and keeps the last copy when a read fails", async () => {
    let clock = 0
    const read = vi.fn<() => Promise<StoreSlugMove[]>>().mockResolvedValueOnce([{ from: "velha", to: "nova" }]).mockRejectedValueOnce(new Error("down"))
    const copy = createShopMoves(read, () => clock)

    expect((await copy()).currentOf("velha")).toBe("nova")
    clock += KEPT_COPY_FRESH_MS - 1
    await copy()
    expect(read).toHaveBeenCalledTimes(1)

    clock += 1
    expect((await copy()).currentOf("velha")).toBe("nova")
    expect(read).toHaveBeenCalledTimes(2)
  })

  it("reads the API's table with no session, and takes an answer that is no list for a read that failed", async () => {
    const fetched = vi.fn(async () => Response.json({ not: "a list" }))
    vi.stubGlobal("fetch", fetched)

    expect((await shopMoves()).currentOf("velha")).toBeNull()
    const [url, init] = fetched.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/store-slug-moves$/)
    expect(new Headers(init.headers).has("authorization")).toBe(false)
    vi.unstubAllGlobals()
  })
})
