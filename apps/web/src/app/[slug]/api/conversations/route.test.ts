// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

function get(init: { origin?: string | null; cookie?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/json" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)
  return GET(new NextRequest(`http://localhost:3000/${slug}/api/conversations`, { headers }), { params: Promise.resolve({ slug }) })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shopper's conversations", () => {
  it("lists them at the API as the shopper, with a GET", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json([{ order: { number: 3, status: "PREPARING", open: true }, unread: 1 }]))
    vi.stubGlobal("fetch", fetched)

    const response = await get({ cookie: "bl_shopper_access=shopper-access" })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject([{ unread: 1 }])
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/customer/conversations")
    const init = fetched.mock.calls[0]?.[1] as RequestInit | undefined
    expect(init?.method).toBe("GET")
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer shopper-access")
  })

  it("answers signed out, cookies cleared, when no session is left", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 })))

    const response = await get({ cookie: "bl_shopper_access=old" })

    expect(response.status).toBe(401)
    expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
  })

  /** Asked on every page of the shop now: an API down in the middle of a renewal must not sign anybody out. */
  it("answers it could not reach the shop, cookies kept, when the renewal finds the API down", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response("", { status: 503 }))
    fetched.mockResolvedValueOnce(Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }))
    vi.stubGlobal("fetch", fetched)

    const response = await get({ cookie: "bl_shopper_access=old; bl_shopper_refresh=refresh" })

    expect(response.status).toBe(502)
    expect(response.cookies.get("bl_shopper_refresh")).toBeUndefined()
  })

  it("refuses another site and a slug that is none, before calling anything", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await get({ origin: "https://outro.site" })).status).toBe(403)
    expect((await get({}, "../stores")).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })
})
