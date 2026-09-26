// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"
import { PATCH } from "./status/route"

const SLUG = "mutante"
const context = { params: Promise.resolve({ slug: SLUG, number: "12" }) }

function request(method: "GET" | "PATCH", body?: unknown, origin = "http://localhost:3000"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/orders/12${method === "PATCH" ? "/status" : ""}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: new Headers({ "content-type": "application/json", origin, cookie: "bl_access=owner-token" }),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("GET /api/stores/[slug]/orders/[number]", () => {
  it("reads the order with the owner's token, the number kept inside its segment", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ number: 12 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await GET(request("GET"), { params: Promise.resolve({ slug: SLUG, number: "../customers" }) })

    expect(response.status).toBe(200)
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/orders/..%2Fcustomers`)
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer owner-token")
  })

  it("refuses a request from another site", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await GET(request("GET", undefined, "https://evil.example"), context)).status).toBe(403)
  })
})

describe("PATCH /api/stores/[slug]/orders/[number]/status", () => {
  it("sends the new status with the owner's token, and passes a refusal through", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ errorCode: "ORDER_CANCELLED" }, { status: 409 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await PATCH(request("PATCH", { status: "PREPARING" }), context)

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ errorCode: "ORDER_CANCELLED" })
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/orders/12/status`)
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(String(init.body))).toEqual({ status: "PREPARING" })
  })

  it("refuses a request from another site", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await PATCH(request("PATCH", { status: "PREPARING" }, "https://evil.example"), context)).status).toBe(403)
  })
})
