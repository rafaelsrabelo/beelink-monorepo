// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET, POST } from "./route"

const SLUG = "mutante"
const context = { params: Promise.resolve({ slug: SLUG }) }

function request(origin = "http://localhost:3000"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/orders?status=PREPARING&q=bia&page=2`, {
    headers: new Headers({ "content-type": "application/json", origin, cookie: "bl_access=owner-token" }),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("GET /api/stores/[slug]/orders", () => {
  it("forwards the status, the search and the page with the owner's token, and answers the API's page", async () => {
    const page = { orders: [], total: 0, page: 2, pageSize: 20 }
    const fetchSpy = vi.fn(async () => Response.json(page))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await GET(request(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(page)
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/orders?status=PREPARING&q=bia&page=2`)
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer owner-token")
  })

  it("refuses a request from another site", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await GET(request("https://evil.example"), context)).status).toBe(403)
  })
})

describe("POST /api/stores/[slug]/orders", () => {
  function post(body: unknown, origin = "http://localhost:3000"): NextRequest {
    return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/orders`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: new Headers({ "content-type": "application/json", origin, cookie: "bl_access=owner-token" }),
    })
  }

  it("sends the order whole with the owner's token, and answers the API's order and status", async () => {
    const body = { customer: { id: "c1" }, items: [{ variantId: "v1", quantity: 2 }], fulfillment: "PICKUP", paymentMethod: "PIX" }
    const fetchSpy = vi.fn(async () => Response.json({ number: 7 }, { status: 201 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(post(body), context)

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ number: 7 })
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/orders`)
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual(body)
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer owner-token")
  })

  it("passes a refusal through, and refuses a request from another site", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "ORDER_DISCOUNT_TOO_LARGE" }, { status: 400 })))

    const refused = await POST(post({}), context)
    expect(refused.status).toBe(400)
    expect(await refused.json()).toEqual({ errorCode: "ORDER_DISCOUNT_TOO_LARGE" })
    expect((await POST(post({}, "https://evil.example"), context)).status).toBe(403)
  })
})
