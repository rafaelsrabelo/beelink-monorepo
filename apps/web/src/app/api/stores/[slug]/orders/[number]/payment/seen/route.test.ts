// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(init: { origin?: string; signedIn?: boolean } = {}) {
  return new NextRequest("http://localhost:3000/api/stores/lessari/orders/12/payment/seen", {
    method: "POST",
    headers: { "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", ...(init.signedIn === false ? {} : { cookie: "bl_access=owner-access" }) },
    body: "{}",
  })
}

const order = { params: Promise.resolve({ slug: "lessari", number: "12" }) }

afterEach(() => vi.unstubAllGlobals())

describe("a paid order seen by its shop, for the panel (BEELINK-207)", () => {
  it("says so at the API as the owner, and answers its 204 as an empty 200", async () => {
    const fetched = vi.fn<Fetched>(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    const response = await POST(request(), order)

    expect([response.status, await response.json()]).toEqual([200, {}])
    expect(String(fetched.mock.calls[0]?.[0]).replace(/^.*\/api/, "")).toBe("/stores/lessari/orders/12/payment/seen")
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("POST")
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  it("hands back the API's refusal as it came", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ errorCode: "ORDER_NOT_FOUND" }, { status: 404 })))

    const response = await POST(request(), order)

    expect([response.status, await response.json()]).toEqual([404, { errorCode: "ORDER_NOT_FOUND" }])
  })

  it("refuses another origin, and a visitor, without asking the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await POST(request({ origin: "https://evil.example" }), order)).status).toBe(403)
    expect((await POST(request({ signedIn: false }), order)).status).toBe(401)
    expect(fetched).not.toHaveBeenCalled()
  })
})
