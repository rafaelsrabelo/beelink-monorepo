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
const offers = { hasOrder: false, firstPurchase: null, coupons: [{ code: "DEZ", audience: "EVERYONE", kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, endsAt: null, missingCents: 0 }] }
const SHOPPER = "bl_shopper_access=shopper-access"

function post(body: object, init: { origin?: string | null; cookie?: string; forwardedFor?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/json" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)
  if (init.forwardedFor) headers.set("x-forwarded-for", init.forwardedFor)

  const request = new NextRequest(`http://localhost:3000/${slug}/api/offers`, { method: "POST", headers, body: JSON.stringify(body) })
  return POST(request, { params: Promise.resolve({ slug }) })
}

const urlOf = (call: unknown[] | undefined) => String(call?.[0])
const initOf = (call: unknown[] | undefined) => call?.[1] as RequestInit | undefined
const bodyOf = (call: unknown[] | undefined) => JSON.parse(String(initOf(call)?.body)) as unknown

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("a shopper's offers for their cart", () => {
  it("are read at the API as the shopper, for the cart sent, from their own address", async () => {
    const fetched = vi.fn(async () => Response.json(offers, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "DELIVERY", addressId: "a1", shipping: { kind: "CARRIER", serviceId: 2 } }, { cookie: SHOPPER, forwardedFor: "203.0.113.7" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(offers)
    expect(urlOf(fetched.mock.calls[0])).toMatch(/\/stores\/loja\/customer\/offers$/)
    expect(new Headers(initOf(fetched.mock.calls[0])?.headers).get("authorization")).toBe("Bearer shopper-access")
    expect(bodyOf(fetched.mock.calls[0])).toEqual({ items, fulfillment: "DELIVERY", addressId: "a1", shipping: { kind: "CARRIER", serviceId: 2 } })
    // The API's limit is per address: it has to see the shopper's, not this server's.
    expect(new Headers(initOf(fetched.mock.calls[0])?.headers).get("x-forwarded-for")).toBe("203.0.113.7")
  })

  // The door refuses what it does not know, and a code is none of its business: nothing typed gets through to it.
  it("send the cart field by field, and nothing else the page put in the body", async () => {
    const fetched = vi.fn(async () => Response.json(offers, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    await post({ items, fulfillment: "PICKUP", couponCode: "OCULTO10", useCashback: true, shownInStore: false, storeId: "outra" }, { cookie: SHOPPER })
    await post({ items: "todos", fulfillment: "TELEPORTE", addressId: 7 }, { cookie: SHOPPER })

    expect(bodyOf(fetched.mock.calls[0])).toEqual({ items, fulfillment: "PICKUP" })
    expect(bodyOf(fetched.mock.calls[1])).toEqual({})
  })

  // The answer names codes, and whether a code exists is told only to an identified customer.
  it("are refused to a visitor, without the API being asked", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "PICKUP" })

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ errorCode: "AUTH_UNAUTHENTICATED" })
    expect(fetched).not.toHaveBeenCalled()
  })

  it("renew a token that ran out, once, and store the new pair on the shop's path", async () => {
    const fetched = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json(RENEWED, { status: 200 }))
      .mockResolvedValueOnce(Response.json(offers, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ items, fulfillment: "PICKUP" }, { cookie: "bl_shopper_access=stale; bl_shopper_refresh=shopper-refresh" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(offers)
    expect(new Headers(initOf(fetched.mock.calls[2])?.headers).get("authorization")).toBe("Bearer new-access")
    const stored = response.headers.getSetCookie().join("\n")
    expect(stored).toContain("bl_shopper_access=new-access")
    expect(stored).toContain("Path=/loja")
  })

  it("refuse a session that ended and clear its cookies, listing nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 })))

    const response = await post({ items, fulfillment: "PICKUP" }, { cookie: "bl_shopper_access=stale; bl_shopper_refresh=gone" })

    expect(response.status).toBe(401)
    expect(response.headers.getSetCookie().join("\n")).toMatch(/bl_shopper_access=;/)
  })

  it("pass the API's refusal of a cart through, and say when the shop could not be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 400, errorCode: "ORDER_VARIANT_INVALID", message: "x" }, { status: 400 })))
    const refused = await post({ items, fulfillment: "PICKUP" }, { cookie: SHOPPER })
    expect([refused.status, (await refused.json()).errorCode]).toEqual([400, "ORDER_VARIANT_INVALID"])

    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("down"))))
    expect((await post({ items, fulfillment: "PICKUP" }, { cookie: SHOPPER })).status).toBe(502)
  })

  it("refuse a request from another site, and a slug that could not be one, asking nothing", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await post({ items }, { cookie: SHOPPER, origin: "https://outro.site" })).status).toBe(403)
    expect((await post({ items }, { cookie: SHOPPER }, "loja/../outra")).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })
})
