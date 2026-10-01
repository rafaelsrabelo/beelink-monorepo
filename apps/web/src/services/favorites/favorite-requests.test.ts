// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { fetchFavoriteIds, likeFavorite, ShopperFavoriteError, unlikeFavorite } from "./favorite-requests"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the favourites' requests", () => {
  it("likes and unlikes at the shop's own handlers, as JSON, and reads a 204 as done", async () => {
    const fetched = vi.fn<Fetched>(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    await expect(likeFavorite("loja nova", "p-1", "v-1")).resolves.toBeUndefined()
    await expect(unlikeFavorite("loja nova", "p-1")).resolves.toBeUndefined()

    const [likeUrl, likeInit] = fetched.mock.calls[0] ?? []
    expect(likeUrl).toBe("/loja%20nova/api/favorites/p-1")
    expect(likeInit?.method).toBe("PUT")
    expect(new Headers(likeInit?.headers).get("content-type")).toBe("application/json")
    expect(JSON.parse(String(likeInit?.body))).toEqual({ variantId: "v-1" })
    expect(fetched.mock.calls[1]?.[1]?.method).toBe("DELETE")
  })

  it("throws the API's code, a busy shop's, or UNKNOWN when nothing answered", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ errorCode: "CUSTOMER_FAVORITE_LIMIT" }, { status: 409 })))
    await expect(likeFavorite("loja", "p-1", null)).rejects.toMatchObject({ errorCode: "CUSTOMER_FAVORITE_LIMIT", status: 409 })

    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => new Response("", { status: 429 })))
    await expect(unlikeFavorite("loja", "p-1")).rejects.toMatchObject({ errorCode: "RATE_LIMITED" })

    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Promise.reject(new Error("offline"))))
    await expect(fetchFavoriteIds("loja")).rejects.toBeInstanceOf(ShopperFavoriteError)
  })

  it("reads the liked ids", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ productIds: ["p-1"] })))
    await expect(fetchFavoriteIds("loja")).resolves.toEqual({ productIds: ["p-1"] })
  })
})
