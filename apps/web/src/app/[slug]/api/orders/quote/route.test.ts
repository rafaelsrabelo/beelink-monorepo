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
const priced = { lines: [], subtotalCents: 20000, promotionDiscountCents: 2500, firstPurchase: null, coupon: null, couponDiscountCents: 0, manualDiscountCents: 0, discountCents: 2500, deliveryFeeCents: null, totalCents: 17500 }

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
  it("prices a visitor's cart at the public door, as anyone's", async () => {
    const fetched = vi.fn(async () => Response.json(priced, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "DELIVERY", couponCode: "  " }, { forwardedFor: "203.0.113.7" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(priced)
    expect(urlOf(fetched.mock.calls[0])).toMatch(/\/stores\/loja\/cart\/quote$/)
    expect(authOf(fetched.mock.calls[0])).toBeNull()
    // Field by field: the public door refuses a body that carries a coupon.
    expect(bodyOf(fetched.mock.calls[0])).toEqual({ items, fulfillment: "DELIVERY" })
    // The API's limit is per address: it has to see the visitor's, not this server's.
    expect(new Headers(initOf(fetched.mock.calls[0])?.headers).get("x-forwarded-for")).toBe("203.0.113.7")
  })

  /** BEELINK-245: a first-purchase promotion makes a shopper's price their own. */
  it("prices a signed-in shopper's cart with no code as theirs, at their cart's door — never the one that counts codes", async () => {
    const theirs = { ...priced, firstPurchase: { status: "NOT_FIRST", promotionName: "Boas-vindas", discountCents: 3000 } }
    const fetched = vi.fn(async () => Response.json(theirs, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "DELIVERY", couponCode: "  ", anything: "else" }, { cookie: "bl_shopper_access=shopper-access", forwardedFor: "203.0.113.7" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(theirs)
    expect(fetched).toHaveBeenCalledOnce()
    expect(urlOf(fetched.mock.calls[0])).toMatch(/\/stores\/loja\/customer\/cart\/quote$/)
    expect(authOf(fetched.mock.calls[0])).toBe("Bearer shopper-access")
    expect(bodyOf(fetched.mock.calls[0])).toEqual({ items, fulfillment: "DELIVERY" })
    expect(new Headers(initOf(fetched.mock.calls[0])?.headers).get("x-forwarded-for")).toBe("203.0.113.7")
  })

  it("prices it as theirs with only the refresh cookie left, storing the renewed pair", async () => {
    const fetched = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json(RENEWED, { status: 200 }))
      .mockResolvedValueOnce(Response.json(priced, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "PICKUP" }, { cookie: "bl_shopper_refresh=shopper-refresh" })

    expect(response.status).toBe(200)
    expect(urlOf(fetched.mock.calls[2])).toMatch(/\/customer\/cart\/quote$/)
    expect(authOf(fetched.mock.calls[2])).toBe("Bearer new-access")
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "new-access", httpOnly: true, path: "/loja" })
  })

  it("prices the cart as a visitor's when the session is gone, and clears its cookies: a price is anyone's to have", async () => {
    const fetched = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json(priced, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "DELIVERY" }, { cookie: "bl_shopper_access=old; bl_shopper_refresh=revoked" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(priced)
    expect(urlOf(fetched.mock.calls[2])).toMatch(/\/stores\/loja\/cart\/quote$/)
    expect(authOf(fetched.mock.calls[2])).toBeNull()
    expect(bodyOf(fetched.mock.calls[2])).toEqual({ items, fulfillment: "DELIVERY" })
    expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
    expect(response.cookies.get("bl_shopper_refresh")?.value).toBe("")
  })

  /** BEELINK-244: credit is somebody's — asked for at either of the shopper's doors, and never at the visitor's. */
  it("asks for the shopper's cashback at their own doors, with a code or without, and never for a visitor", async () => {
    const fetched = vi.fn(async () => Response.json(priced, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    await post({ items, fulfillment: "DELIVERY", useCashback: true }, { cookie: "bl_shopper_access=shopper-access" })
    await post({ items, fulfillment: "DELIVERY", couponCode: "BEMVINDO10", useCashback: true }, { cookie: "bl_shopper_access=shopper-access" })
    // Anything but `true` is not asking: the doors refuse a field they do not know the shape of.
    await post({ items, fulfillment: "DELIVERY", useCashback: "yes" }, { cookie: "bl_shopper_access=shopper-access" })
    await post({ items, fulfillment: "DELIVERY", useCashback: true })

    expect(fetched.mock.calls.map((call) => [urlOf(call).replace(/^.*\/stores\/loja/, ""), bodyOf(call)])).toEqual([
      ["/customer/cart/quote", { items, fulfillment: "DELIVERY", useCashback: true }],
      ["/customer/orders/quote", { items, fulfillment: "DELIVERY", couponCode: "BEMVINDO10", useCashback: true }],
      ["/customer/cart/quote", { items, fulfillment: "DELIVERY" }],
      ["/cart/quote", { items, fulfillment: "DELIVERY" }],
    ])
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

    const response = await post({ items, fulfillment: "PICKUP", couponCode: "BEMVINDO10" }, { cookie: "bl_shopper_access=old" })

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ errorCode: "AUTH_UNAUTHENTICATED" })
    expect(urlOf(fetched.mock.calls[0])).toMatch(/\/customer\/orders\/quote$/)
    expect(fetched).toHaveBeenCalledOnce()
    expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
  })

  it("passes a refusal through as it came — a line the shop no longer sells, too many tries", async () => {
    const gone = { statusCode: 400, errorCode: "ORDER_VARIANT_INVALID", message: "x", details: { variantIds: ["v1"] } }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(gone, { status: 400 })))
    const first = await post({ items, fulfillment: "DELIVERY" })
    expect(first.status).toBe(400)
    expect(await first.json()).toEqual(gone)

    const theirs = await post({ items, fulfillment: "DELIVERY" }, { cookie: "bl_shopper_access=shopper-access" })
    expect(theirs.status).toBe(400)
    expect(await theirs.json()).toEqual(gone)

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 429, errorCode: "RATE_LIMITED", message: "x" }, { status: 429 })))
    expect((await post({ items, fulfillment: "DELIVERY", couponCode: "CHUTE" }, { cookie: "bl_shopper_access=shopper-access" })).status).toBe(429)
  })

  it("says the shop could not be reached, at every door", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("down"))))

    expect((await post({ items, fulfillment: "DELIVERY" })).status).toBe(502)
    expect((await post({ items, fulfillment: "DELIVERY" }, { cookie: "bl_shopper_access=shopper-access" })).status).toBe(502)
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
