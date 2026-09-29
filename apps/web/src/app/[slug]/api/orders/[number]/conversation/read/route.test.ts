// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shopper reading the shop's messages", () => {
  it("marks them read at the API as the shopper, and answers the conversation as it stands", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json({ order: { number: 7, status: "ACCEPTED", open: true }, messages: [], unread: 0 }))
    vi.stubGlobal("fetch", fetched)

    const headers = new Headers({ "content-type": "application/json", origin: "http://localhost:3000", cookie: "bl_shopper_access=shopper-access" })
    const request = new NextRequest("http://localhost:3000/loja/api/orders/7/conversation/read", { method: "POST", headers, body: "{}" })
    const response = await POST(request, { params: Promise.resolve({ slug: "loja", number: "7" }) })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ unread: 0 })
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/customer/orders/7/conversation/read")
    expect((fetched.mock.calls[0]?.[1] as RequestInit | undefined)?.method).toBe("POST")
  })
})
