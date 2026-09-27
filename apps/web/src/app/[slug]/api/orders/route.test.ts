// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const RENEWED = {
  accessToken: "new-access",
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: "new-refresh",
  refreshTokenExpiresAt: new Date(Date.now() + 2_592_000_000).toISOString(),
  user: { id: "1", name: "Bia", email: "bia@exemplo.com", emailVerified: true, createdAt: "" },
}

const cart = { items: [{ variantId: "v1", quantity: 2 }], fulfillment: "DELIVERY", paymentMethod: "PIX" }
const placed = { number: 12, status: "RECEIVED", items: [], totalCents: 17980 }

function post(init: { origin?: string | null; cookie?: string; contentType?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": init.contentType ?? "application/json" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)

  const request = new NextRequest(`http://localhost:3000/${slug}/api/orders`, { method: "POST", headers, body: JSON.stringify(cart) })
  return POST(request, { params: Promise.resolve({ slug }) })
}

const urlOf = (call: unknown[] | undefined) => String(call?.[0])
const authOf = (call: unknown[] | undefined) => new Headers((call?.[1] as RequestInit | undefined)?.headers).get("authorization")

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the cart's order", () => {
  it("places the cart at the API as the shopper, and answers the placed order", async () => {
    const fetched = vi.fn(async () => Response.json(placed, { status: 201 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ cookie: "bl_shopper_access=shopper-access" })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(placed)
    expect(urlOf(fetched.mock.calls[0])).toContain("/stores/loja/customer/orders")
    expect(authOf(fetched.mock.calls[0])).toBe("Bearer shopper-access")
  })

  it("renews a token that ran out, once, places the order and stores the new pair on the shop's path", async () => {
    const fetched = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json(RENEWED, { status: 200 }))
      .mockResolvedValueOnce(Response.json(placed, { status: 201 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ cookie: "bl_shopper_access=old; bl_shopper_refresh=shopper-refresh" })

    expect(response.status).toBe(201)
    expect(urlOf(fetched.mock.calls[1])).toContain("/stores/loja/customer/refresh")
    expect(authOf(fetched.mock.calls[2])).toBe("Bearer new-access")
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "new-access", httpOnly: true, path: "/loja" })
  })

  it("answers signed out, and clears the cookies, when no session is left", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 })))

    const response = await post({ cookie: "bl_shopper_access=old" })

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ errorCode: "AUTH_UNAUTHENTICATED" })
    expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
  })

  it("passes a refusal through as it came, with its details", async () => {
    const refusal = { statusCode: 409, errorCode: "ORDER_STOCK_INSUFFICIENT", message: "x", details: { shortages: [{ variantId: "v1", available: 1 }] } }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(refusal, { status: 409 })))

    const response = await post({ cookie: "bl_shopper_access=shopper-access" })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual(refusal)
  })

  it("refuses another site, a plain form and a slug that is not one, before calling anything", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await post({ origin: "https://outro.site" })).status).toBe(403)
    expect((await post({ contentType: "application/x-www-form-urlencoded" })).status).toBe(415)
    expect((await post({}, "../stores")).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })
})
