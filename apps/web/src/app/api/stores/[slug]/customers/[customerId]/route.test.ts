// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET, PATCH } from "./route"

const SLUG = "mutante"
const context = { params: Promise.resolve({ slug: SLUG, customerId: "c1" }) }

function request(method: "GET" | "PATCH" = "GET", body?: unknown, origin = "http://localhost:3000", cookie = "bl_access=owner-token"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/customers/c1`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: new Headers({ "content-type": "application/json", origin, cookie }),
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

    expect((await GET(request("GET", undefined, "https://evil.example"), context)).status).toBe(403)
  })
})

describe("PATCH /api/stores/[slug]/customers/[customerId]", () => {
  const body = { name: "Bia Souza", phone: "(11) 98888-7777", address: { city: "Campinas", complement: null } }

  it("sends the correction whole with the owner's token, and answers the API's record", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ id: "c1", name: "Bia Souza" }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await PATCH(request("PATCH", body), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: "c1", name: "Bia Souza" })
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/customers/c1`)
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(String(init.body))).toEqual(body)
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer owner-token")
  })

  it("keeps a hostile id inside its segment", async () => {
    const fetchSpy = vi.fn(async () => Response.json({}))
    vi.stubGlobal("fetch", fetchSpy)

    await PATCH(request("PATCH", body), { params: Promise.resolve({ slug: SLUG, customerId: "../orders" }) })

    expect((fetchSpy.mock.calls[0]! as unknown as [string])[0]).toBe(`http://api.test/api/stores/${SLUG}/customers/..%2Forders`)
  })

  it("passes a phone another customer has through as the API's 409", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "CUSTOMER_PHONE_TAKEN" }, { status: 409 })))

    const response = await PATCH(request("PATCH", body), context)

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ errorCode: "CUSTOMER_PHONE_TAKEN" })
  })

  it("refuses a request from another site, and one with no session, before the API", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    expect((await PATCH(request("PATCH", body, "https://evil.example"), context)).status).toBe(403)
    const unsigned = await PATCH(request("PATCH", body, "http://localhost:3000", ""), context)
    expect(unsigned.status).toBe(401)
    expect(await unsigned.json()).toMatchObject({ errorCode: "AUTH_UNAUTHENTICATED" })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
