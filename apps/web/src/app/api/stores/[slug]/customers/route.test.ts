// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET, POST } from "./route"

const SLUG = "mutante"
const context = { params: Promise.resolve({ slug: SLUG }) }

function request(origin = "http://localhost:3000"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/customers?q=bia&page=2`, {
    headers: new Headers({ "content-type": "application/json", origin, cookie: "bl_access=owner-token" }),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("GET /api/stores/[slug]/customers", () => {
  it("forwards the search and the page with the owner's token, and answers the API's page", async () => {
    const page = { customers: [], total: 0, page: 2, pageSize: 20 }
    const fetchSpy = vi.fn(async () => Response.json(page))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await GET(request(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(page)
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/customers?q=bia&page=2`)
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer owner-token")
  })

  it("refuses a request from another site", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await GET(request("https://evil.example"), context)).status).toBe(403)
  })
})

describe("POST /api/stores/[slug]/customers", () => {
  function post(body: unknown, origin = "http://localhost:3000"): NextRequest {
    return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/customers`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: new Headers({ "content-type": "application/json", origin, cookie: "bl_access=owner-token" }),
    })
  }

  it("registers the customer with the owner's token, and passes the phone-taken conflict through", async () => {
    const body = { name: "Rita", phone: "(11) 96666-5555" }
    const fetchSpy = vi.fn(async () => Response.json({ errorCode: "CUSTOMER_PHONE_TAKEN" }, { status: 409 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(post(body), context)

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ errorCode: "CUSTOMER_PHONE_TAKEN" })
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/customers`)
    expect(JSON.parse(String(init.body))).toEqual(body)
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer owner-token")
  })

  it("refuses a request from another site", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await POST(post({}, "https://evil.example"), context)).status).toBe(403)
  })
})
