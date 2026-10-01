// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

function get(init: { origin?: string; cookie?: string; json?: boolean } = {}, slug = "loja") {
  const headers = new Headers(init.json === false ? {} : { "content-type": "application/json" })
  headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)
  return GET(new NextRequest(`http://localhost:3000/${slug}/api/favorites/ids`, { headers }), { params: Promise.resolve({ slug }) })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shopper's liked ids", () => {
  it("reads them at the API as the shopper", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json({ productIds: ["p-1"] }))
    vi.stubGlobal("fetch", fetched)

    const response = await get({ cookie: "bl_shopper_access=shopper-access" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ productIds: ["p-1"] })
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/customer/favorites/ids")
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer shopper-access")
  })

  it("refuses another origin, a body that is not JSON and a slug that names no shop, and asks nothing", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await get({ origin: "https://outro.site" })).status).toBe(403)
    expect((await get({ json: false })).status).toBe(415)
    expect((await get({}, "Loja Nova")).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })
})
