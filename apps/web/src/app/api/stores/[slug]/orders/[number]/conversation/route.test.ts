// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST as send } from "./messages/route"
import { POST as read } from "./read/route"
import { GET } from "./route"

const params = { params: Promise.resolve({ slug: "loja", number: "18" }) }

function request(path: string, method = "GET", body?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: "bl_access=owner-access" },
    ...(body ? { body } : {}),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("an order's conversation, for the panel", () => {
  it("reads it at the API as the owner", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json({ messages: [], unread: 0 }))
    vi.stubGlobal("fetch", fetched)

    const response = await GET(request("/api/stores/loja/orders/18/conversation"), params)

    expect(response.status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/orders/18/conversation")
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  it("answers with only the text, and passes a refusal through", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json({ errorCode: "ORDER_CONVERSATION_CLOSED" }, { status: 409 }))
    vi.stubGlobal("fetch", fetched)

    const response = await send(request("/api/stores/loja/orders/18/conversation/messages", "POST", JSON.stringify({ body: "Oi", author: "CUSTOMER" })), params)

    expect(response.status).toBe(409)
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual({ body: "Oi" })
  })

  it("marks the customer's messages read", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json({ unread: 0 }))
    vi.stubGlobal("fetch", fetched)

    await read(request("/api/stores/loja/orders/18/conversation/read", "POST", "{}"), params)

    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/orders/18/conversation/read")
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("POST")
  })
})
