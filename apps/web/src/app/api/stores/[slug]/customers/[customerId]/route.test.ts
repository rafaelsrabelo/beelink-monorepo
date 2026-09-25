// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

const SLUG = "mutante"

function request(origin = "http://localhost:3000"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/customers/c1`, {
    headers: new Headers({ "content-type": "application/json", origin, cookie: "bl_access=owner-token" }),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("GET /api/stores/[slug]/customers/[customerId]", () => {
  it("reads the customer with the owner's token, the id kept inside its segment", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ id: "c1", name: "Bia" }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await GET(request(), { params: Promise.resolve({ slug: SLUG, customerId: "../orders" }) })

    expect(response.status).toBe(200)
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/customers/..%2Forders`)
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer owner-token")
  })

  it("refuses a request from another site", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await GET(request("https://evil.example"), { params: Promise.resolve({ slug: SLUG, customerId: "c1" }) })).status).toBe(403)
  })
})
