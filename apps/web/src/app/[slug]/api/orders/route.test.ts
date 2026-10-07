// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"
import { encodeOrigin } from "@/lib/origin-cookie"

const RENEWED = {
  accessToken: "new-access",
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: "new-refresh",
  refreshTokenExpiresAt: new Date(Date.now() + 2_592_000_000).toISOString(),
  user: { id: "1", name: "Bia", email: "bia@exemplo.com", emailVerified: true, createdAt: "" },
}

const cart = { items: [{ variantId: "v1", quantity: 2 }], fulfillment: "DELIVERY", paymentMethod: "PIX" }
const placed = { number: 12, status: "RECEIVED", items: [], totalCents: 17980 }

function post(init: { origin?: string | null; cookie?: string; contentType?: string; body?: unknown; referer?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": init.contentType ?? "application/json", "user-agent": "Mozilla/5.0 (teste)" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)
  if (init.referer) headers.set("referer", init.referer)

  const request = new NextRequest(`http://localhost:3000/${slug}/api/orders`, { method: "POST", headers, body: JSON.stringify(init.body ?? cart) })
  return POST(request, { params: Promise.resolve({ slug }) })
}

const urlOf = (call: unknown[] | undefined) => String(call?.[0])
const bodyOf = (call: unknown[] | undefined) => JSON.parse(String((call?.[1] as RequestInit | undefined)?.body)) as Record<string, unknown>
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

describe("the cart's order — where its buyer came from (BEELINK-275)", () => {
  const SESSION = "bl_shopper_access=shopper-access"
  const ARRIVED = Date.now() - 86_400_000
  const ORIGIN = `bl_origin=${encodeOrigin({ source: "facebook", medium: "cpc", campaign: "teste", content: null, term: null, fbclid: "abc123", at: ARRIVED })}`
  const FBP = "_fbp=fb.1.1759795200000.1234567890"
  const campaign = { source: "facebook", medium: "cpc", campaign: "teste", content: null, term: null, arrivedAt: new Date(ARRIVED).toISOString() }

  /** The API, as the handler's two kinds of call find it: the shop's public read, and the order. */
  function api(shop: { metaPixelId: string | null } | null) {
    const fetched = vi.fn(async (url: unknown) => {
      if (String(url).endsWith("/stores/loja/public")) return shop ? Response.json(shop) : Response.json({}, { status: 404 })
      return Response.json(placed, { status: 201 })
    })
    vi.stubGlobal("fetch", fetched)
    return { orderCall: () => fetched.mock.calls.find((call) => String(call[0]).includes("/customer/orders")), shopCalls: () => fetched.mock.calls.filter((call) => String(call[0]).endsWith("/public")).length }
  }

  it("sends the campaign read from the shop's cookie, with no pixel and no answer about cookies", async () => {
    const calls = api(null)

    const response = await post({ cookie: `${SESSION}; ${ORIGIN}; ${FBP}` })

    expect(response.status).toBe(201)
    expect(bodyOf(calls.orderCall())).toEqual({ ...cart, origin: campaign })
    // Nobody said yes: the shop is not even asked for.
    expect(calls.shopCalls()).toBe(0)
  })

  it("adds what stood in the browser only with a yes at a shop that has a pixel", async () => {
    const calls = api({ metaPixelId: "123456789012345" })

    await post({ cookie: `${SESSION}; ${ORIGIN}; ${FBP}; bl_consent=granted`, referer: "http://localhost:3000/loja/carrinho?cupom=VIP" })

    expect(bodyOf(calls.orderCall())).toEqual({
      ...cart,
      origin: campaign,
      marketingConsent: { fbclid: "abc123", clickedAt: new Date(ARRIVED).toISOString(), fbp: "fb.1.1759795200000.1234567890", userAgent: "Mozilla/5.0 (teste)", pageUrl: "http://localhost:3000/loja/carrinho" },
    })
  })

  it("sends no consent, no click and no _fbp for a no, nor for a yes left over at a shop with no pixel", async () => {
    for (const [consent, shop] of [["denied", { metaPixelId: "123456789012345" }], ["granted", { metaPixelId: null }], ["granted", null]] as const) {
      const calls = api(shop)

      await post({ cookie: `${SESSION}; ${ORIGIN}; ${FBP}; bl_consent=${consent}`, referer: "http://localhost:3000/loja/carrinho" })

      expect(bodyOf(calls.orderCall()), consent).toEqual({ ...cart, origin: campaign })
    }
  })

  it("throws away what the page's body says of origin and consent: only the cookies speak", async () => {
    const calls = api({ metaPixelId: "123456789012345" })
    const forged = { ...cart, origin: { source: "forjado", campaign: "x" }, marketingConsent: { fbclid: "forjado", clickedAt: new Date().toISOString() } }

    await post({ cookie: SESSION, body: forged })
    expect(bodyOf(calls.orderCall())).toEqual(cart)

    await post({ cookie: `${SESSION}; ${ORIGIN}`, body: forged })
    expect(bodyOf(vi.mocked(fetch).mock.calls.at(-1))).toEqual({ ...cart, origin: campaign })
  })

  it("places an order with no origin for a visitor who came by none", async () => {
    const calls = api(null)

    await post({ cookie: SESSION })

    expect(bodyOf(calls.orderCall())).toEqual(cart)
  })
})
