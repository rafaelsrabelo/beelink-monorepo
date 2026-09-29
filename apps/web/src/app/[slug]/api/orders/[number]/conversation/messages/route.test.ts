// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

function post(body: string, init: { contentType?: string; forwardedFor?: string } = {}) {
  const headers = new Headers({ "content-type": init.contentType ?? "application/json", origin: "http://localhost:3000", cookie: "bl_shopper_access=shopper-access" })
  if (init.forwardedFor) headers.set("x-forwarded-for", init.forwardedFor)
  const request = new NextRequest("http://localhost:3000/loja/api/orders/7/conversation/messages", { method: "POST", headers, body })
  return POST(request, { params: Promise.resolve({ slug: "loja", number: "7" }) })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("a message from the shopper", () => {
  it("sends only the text, with the visitor's address, and answers the conversation the API made", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json({ order: { number: 7, status: "ACCEPTED", open: true }, messages: [{ body: "Oi" }], unread: 0 }, { status: 201 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post(JSON.stringify({ body: "Oi", author: "SHOP" }), { forwardedFor: "203.0.113.9" })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ messages: [{ body: "Oi" }] })
    const init = fetched.mock.calls[0]?.[1] as RequestInit | undefined
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/customer/orders/7/conversation/messages")
    expect(JSON.parse(String(init?.body))).toEqual({ body: "Oi" })
    expect(new Headers(init?.headers).get("x-forwarded-for")).toBe("203.0.113.9")
  })

  it("passes a closed conversation's refusal through as it came", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 409, errorCode: "ORDER_CONVERSATION_CLOSED", message: "x" }, { status: 409 })))

    const response = await post(JSON.stringify({ body: "Oi" }))

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ errorCode: "ORDER_CONVERSATION_CLOSED" })
  })

  it("refuses a plain form before calling anything", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await post("body=Oi", { contentType: "application/x-www-form-urlencoded" })).status).toBe(415)
    expect(fetched).not.toHaveBeenCalled()
  })
})
