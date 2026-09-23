// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const SLUG = "asfalto-norte"
const context = { params: Promise.resolve({ slug: SLUG }) }

function request(init: { origin?: string; contentType?: string; forwardedFor?: string } = {}): NextRequest {
  return new NextRequest(`http://localhost:3000/api/storefront/${SLUG}/contact`, {
    method: "POST",
    headers: new Headers({
      "content-type": init.contentType ?? "application/json",
      origin: init.origin ?? "http://localhost:3000",
      "x-forwarded-for": init.forwardedFor ?? "203.0.113.7",
      cookie: "bl_access=owner-token",
    }),
    body: JSON.stringify({ componentId: "c", name: "Carlos", answers: {} }),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("POST /api/storefront/[slug]/contact", () => {
  it("forwards the visitor's address and never a token", async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(request(), context)

    expect(response.status).toBe(204)
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/contact`)
    const headers = init.headers as Record<string, string>
    expect(headers["x-forwarded-for"]).toBe("203.0.113.7")
    expect(headers.authorization).toBeUndefined()
  })

  it("passes the API's refusal through as it was written", async () => {
    const error = { statusCode: 400, errorCode: "LEAD_ANSWER_INVALID", message: "E-mail: campo obrigatório" }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(error, { status: 400 })))

    const response = await POST(request(), context)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(error)
  })

  /** Another site's page posting a form here with the visitor's browser. */
  it("refuses another origin before reaching the API", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(request({ origin: "https://outro.site" }), context)

    expect(response.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
