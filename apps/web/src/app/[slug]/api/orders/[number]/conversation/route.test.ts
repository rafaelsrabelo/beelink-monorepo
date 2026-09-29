// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

function get(number: string, cookie = "bl_shopper_access=shopper-access") {
  const headers = new Headers({ "content-type": "application/json", origin: "http://localhost:3000", cookie })
  return GET(new NextRequest(`http://localhost:3000/loja/api/orders/${number}/conversation`, { headers }), { params: Promise.resolve({ slug: "loja", number }) })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("one order's conversation, for the shopper", () => {
  it("reads it at the API as the shopper, and answers it as it came", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json({ order: { number: 7, status: "ACCEPTED", open: true }, messages: [], unread: 0 }))
    vi.stubGlobal("fetch", fetched)

    const response = await get("7")

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ order: { number: 7 }, messages: [] })
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/customer/orders/7/conversation")
    expect((fetched.mock.calls[0]?.[1] as RequestInit | undefined)?.method).toBe("GET")
  })

  it("passes the API's not-found through, and refuses a number that is none without asking", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 404, errorCode: "ORDER_NOT_FOUND", message: "x" }, { status: 404 })))
    expect((await get("99")).status).toBe(404)

    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)
    expect((await get("abc")).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })
})
