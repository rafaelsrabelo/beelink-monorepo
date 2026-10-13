// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { CourierApplicationPayload } from "@harness-monorepo/contracts"

// App
import { POST } from "./route"

/** Made up: a CPF whose check digits are right and an address nobody owns. */
const ZULEICA = {
  name: "Zuleica Tavares",
  document: "529.982.247-25",
  email: "zuleica.tavares@exemplo.test",
  whatsapp: "(85) 98765-4321",
  city: "FORTALEZA_CE",
  vehicle: "MOTORCYCLE",
  acceptedTerms: true,
  website: "",
} satisfies CourierApplicationPayload

function request(init: { origin?: string; contentType?: string; forwardedFor?: string; body?: string } = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/courier-applications", {
    method: "POST",
    headers: new Headers({
      "content-type": init.contentType ?? "application/json",
      origin: init.origin ?? "http://localhost:3000",
      "x-forwarded-for": init.forwardedFor ?? "203.0.113.7",
      cookie: "bl_access=owner-token; bl_site_consent=granted",
    }),
    body: init.body ?? JSON.stringify(ZULEICA),
  })
}

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function apiAnswers(response: () => Response) {
  const fetched = vi.fn<Fetched>(async () => response())
  vi.stubGlobal("fetch", fetched)
  return fetched
}

afterEach(() => vi.unstubAllGlobals())

describe("POST /api/courier-applications (BEELINK-322)", () => {
  it("hands the application to the API as it came, with the visitor's address and never a token or a cookie", async () => {
    const fetched = apiAnswers(() => new Response(null, { status: 204 }))

    const response = await POST(request())

    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
    expect(fetched).toHaveBeenCalledTimes(1)
    const [url, init] = fetched.mock.calls[0]!
    expect(url).toBe("http://api.test/api/courier-applications")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual(ZULEICA)
    const headers = init?.headers as Record<string, string>
    expect(headers["x-forwarded-for"]).toBe("203.0.113.7")
    expect(headers["content-type"]).toBe("application/json")
    expect(headers.authorization).toBeUndefined()
    expect(headers.cookie).toBeUndefined()
  })

  /** The limit is per address: two visitors must reach the API as two. */
  it("forwards each visitor's own address", async () => {
    const fetched = apiAnswers(() => new Response(null, { status: 204 }))

    await POST(request({ forwardedFor: "203.0.113.7" }))
    await POST(request({ forwardedFor: "198.51.100.23" }))

    expect(fetched.mock.calls.map(([, init]) => (init?.headers as Record<string, string>)["x-forwarded-for"])).toEqual(["203.0.113.7", "198.51.100.23"])
  })

  it.each([
    ["a field's refusal", { statusCode: 400, errorCode: "COURIER_DOCUMENT_INVALID", message: "document must be a valid CPF" }],
    ["the limit", { statusCode: 429, errorCode: "RATE_LIMITED", message: "Too many requests" }],
    ["a failure", { statusCode: 500, errorCode: "INTERNAL_SERVER_ERROR", message: "Internal server error" }],
  ])("passes %s through as the API wrote it", async (_, error) => {
    apiAnswers(() => Response.json(error, { status: error.statusCode }))

    const response = await POST(request())

    expect(response.status).toBe(error.statusCode)
    expect(await response.json()).toEqual(error)
  })

  /** Another site's page posting a form here with the visitor's browser. */
  it("refuses another origin before reaching the API", async () => {
    const fetched = apiAnswers(() => new Response(null, { status: 204 }))

    const response = await POST(request({ origin: "https://outro.site" }))

    expect(response.status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })

  /** A plain cross-site `<form>` cannot say it speaks JSON without a preflight. */
  it("refuses a body that does not say it is JSON before reaching the API", async () => {
    const fetched = apiAnswers(() => new Response(null, { status: 204 }))

    const response = await POST(request({ contentType: "application/x-www-form-urlencoded", body: "name=Zuleica" }))

    expect(response.status).toBe(415)
    expect(fetched).not.toHaveBeenCalled()
  })
})
