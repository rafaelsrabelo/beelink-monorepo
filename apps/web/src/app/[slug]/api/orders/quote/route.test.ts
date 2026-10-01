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

const items = [{ variantId: "v1", quantity: 2 }]
const priced = { lines: [], subtotalCents: 20000, promotionDiscountCents: 2500, coupon: null, couponDiscountCents: 0, manualDiscountCents: 0, discountCents: 2500, deliveryFeeCents: null, totalCents: 17500 }

function post(body: object, init: { origin?: string | null; cookie?: string; contentType?: string; forwardedFor?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": init.contentType ?? "application/json" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)
  if (init.forwardedFor) headers.set("x-forwarded-for", init.forwardedFor)

  const request = new NextRequest(`http://localhost:3000/${slug}/api/orders/quote`, { method: "POST", headers, body: JSON.stringify(body) })
  return POST(request, { params: Promise.resolve({ slug }) })
}

const urlOf = (call: unknown[] | undefined) => String(call?.[0])
const initOf = (call: unknown[] | undefined) => call?.[1] as RequestInit | undefined
const authOf = (call: unknown[] | undefined) => new Headers(initOf(call)?.headers).get("authorization")
const bodyOf = (call: unknown[] | undefined) => JSON.parse(String(initOf(call)?.body)) as unknown

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the cart's price", () => {
  it("prices a cart with no code at the public door, as anyone — the shopper's token stays home", async () => {
    const fetched = vi.fn(async () => Response.json(priced, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "DELIVERY", couponCode: "  " }, { cookie: "bl_shopper_access=shopper-access", forwardedFor: "203.0.113.7" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(priced)
    expect(urlOf(fetched.mock.calls[0])).toMatch(/\/stores\/loja\/cart\/quote$/)
    expect(authOf(fetched.mock.calls[0])).toBeNull()
    // Field by field: the public door refuses a body that carries a coupon.
    expect(bodyOf(fetched.mock.calls[0])).toEqual({ items, fulfillment: "DELIVERY" })
    // The API's limit is per address: it has to see the visitor's, not this server's.
    expect(new Headers(initOf(fetched.mock.calls[0])?.headers).get("x-forwarded-for")).toBe("203.0.113.7")
  })

  it("takes a code to the shopper's own door, with their session", async () => {
    const withCoupon = { ...priced, coupon: { status: "APPLIED", code: "BEMVINDO10", kind: "PERCENT" }, couponDiscountCents: 1750, discountCents: 4250, totalCents: 15750 }
    const fetched = vi.fn(async () => Response.json(withCoupon, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "PICKUP", couponCode: "bemvindo10", anything: "else" }, { cookie: "bl_shopper_access=shopper-access" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(withCoupon)
    expect(urlOf(fetched.mock.calls[0])).toMatch(/\/stores\/loja\/customer\/orders\/quote$/)
    expect(authOf(fetched.mock.calls[0])).toBe("Bearer shopper-access")
    expect(bodyOf(fetched.mock.calls[0])).toEqual({ items, fulfillment: "PICKUP", couponCode: "bemvindo10" })
  })

  it("renews a token that ran out, once, and stores the new pair on the shop's path", async () => {
    const fetched = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json(RENEWED, { status: 200 }))
      .mockResolvedValueOnce(Response.json(priced, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "PICKUP", couponCode: "BEMVINDO10" }, { cookie: "bl_shopper_access=old; bl_shopper_refresh=shopper-refresh" })

    expect(response.status).toBe(200)
    expect(authOf(fetched.mock.calls[2])).toBe("Bearer new-access")
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "new-access", httpOnly: true, path: "/loja" })
  })

  it("answers signed out to a code with no session left: a code is checked for an identified customer only", async () => {
    const fetched = vi.fn(async () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "PICKUP", couponCode: "BEMVINDO10" })

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ errorCode: "AUTH_UNAUTHENTICATED" })
    expect(urlOf(fetched.mock.calls[0])).toMatch(/\/customer\/orders\/quote$/)
  })

  it("passes a refusal through as it came — a line the shop no longer sells, too many tries", async () => {
    const gone = { statusCode: 400, errorCode: "ORDER_VARIANT_INVALID", message: "x", details: { variantIds: ["v1"] } }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(gone, { status: 400 })))
    const first = await post({ items, fulfillment: "DELIVERY" })
    expect(first.status).toBe(400)
    expect(await first.json()).toEqual(gone)

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 429, errorCode: "RATE_LIMITED", message: "x" }, { status: 429 })))
    expect((await post({ items, fulfillment: "DELIVERY", couponCode: "CHUTE" }, { cookie: "bl_shopper_access=shopper-access" })).status).toBe(429)
  })

  it("says the shop could not be reached, at either door", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("down"))))

    expect((await post({ items, fulfillment: "DELIVERY" })).status).toBe(502)
    expect((await post({ items, fulfillment: "DELIVERY", couponCode: "BEMVINDO10" }, { cookie: "bl_shopper_access=shopper-access" })).status).toBe(502)
  })

  it("refuses another site, a plain form and a slug that is not one, before calling anything", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await post({ items }, { origin: "https://outro.site" })).status).toBe(403)
    expect((await post({ items }, { contentType: "application/x-www-form-urlencoded" })).status).toBe(415)
    expect((await post({ items }, {}, "../stores")).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })
})
