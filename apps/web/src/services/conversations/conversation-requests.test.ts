// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { fetchShopperConversations, sendShopperMessage, ShopperConversationError } from "./conversation-requests"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shopper's conversation requests", () => {
  it("ask the shop's own handler, saying they speak JSON even to read", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json([]))
    vi.stubGlobal("fetch", fetched)

    await fetchShopperConversations("loja")

    expect(fetched).toHaveBeenCalledWith("/loja/api/conversations", expect.objectContaining({ method: "GET" }))
    const init = fetched.mock.calls[0]?.[1] as RequestInit | undefined
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json")
  })

  it("throw the API's code, a rate limit with none, and a network failure as unknown", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "ORDER_CONVERSATION_CLOSED" }, { status: 409 })))
    await expect(sendShopperMessage("loja", 7, { body: "Oi" })).rejects.toMatchObject({ errorCode: "ORDER_CONVERSATION_CLOSED", status: 409 })

    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })))
    await expect(sendShopperMessage("loja", 7, { body: "Oi" })).rejects.toMatchObject({ errorCode: "RATE_LIMITED" })

    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))))
    await expect(fetchShopperConversations("loja")).rejects.toBeInstanceOf(ShopperConversationError)
  })
})
