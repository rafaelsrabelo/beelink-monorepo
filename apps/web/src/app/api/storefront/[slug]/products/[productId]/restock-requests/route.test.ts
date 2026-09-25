// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const SLUG = "lessari"
const PRODUCT = "01a0d36c-053f-7200-b701-7632cf9ea153"
const context = { params: Promise.resolve({ slug: SLUG, productId: PRODUCT }) }

function request(origin = "http://localhost:3000"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/storefront/${SLUG}/products/${PRODUCT}/restock-requests`, {
    method: "POST",
    headers: new Headers({
      "content-type": "application/json",
      origin,
      "x-forwarded-for": "203.0.113.7",
      cookie: "bl_access=owner-token",
    }),
    body: JSON.stringify({ variantId: "v1", phone: "11977776666" }),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("POST /api/storefront/[slug]/products/[productId]/restock-requests", () => {
  it("forwards the visitor's address, never a token, and answers the API's 201 with no body", async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 201 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(request(), context)

    expect(response.status).toBe(201)
    expect(await response.text()).toBe("")
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/products/${PRODUCT}/restock-requests`)
    const headers = init.headers as Record<string, string>
    expect(headers["x-forwarded-for"]).toBe("203.0.113.7")
    expect(headers.authorization).toBeUndefined()
  })

  it("passes the API's refusal through as it was written", async () => {
    const error = { statusCode: 400, errorCode: "RESTOCK_VARIANT_INVALID", message: "x" }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(error, { status: 400 })))

    const response = await POST(request(), context)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(error)
  })

  it("refuses another origin before reaching the API", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(request("https://outro.site"), context)

    expect(response.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
