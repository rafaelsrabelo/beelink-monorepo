// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const SLUG = "mutante"

function request(body: unknown, origin = "http://localhost:3000"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/customers/c1/merge`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: new Headers({ "content-type": "application/json", origin, cookie: "bl_access=owner-token" }),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("POST /api/stores/[slug]/customers/[customerId]/merge", () => {
  it("forwards the other record with the owner's token, and answers the record the API kept", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ id: "c2", name: "Maria" }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(request({ otherId: "c2" }), { params: Promise.resolve({ slug: SLUG, customerId: "../c1" }) })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: "c2", name: "Maria" })
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/customers/..%2Fc1/merge`)
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual({ otherId: "c2" })
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer owner-token")
  })

  it("passes the API's refusal on as it came", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "CUSTOMER_MERGE_TWO_ACCOUNTS" }, { status: 409 })))

    const response = await POST(request({ otherId: "c2" }), { params: Promise.resolve({ slug: SLUG, customerId: "c1" }) })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ errorCode: "CUSTOMER_MERGE_TWO_ACCOUNTS" })
  })

  it("refuses a request from another site", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await POST(request({ otherId: "c2" }, "https://evil.example"), { params: Promise.resolve({ slug: SLUG, customerId: "c1" }) })).status).toBe(403)
  })
})
