// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const SLUG = "mutante"
const context = { params: Promise.resolve({ slug: SLUG }) }
const sale = { items: [{ variantId: "v1", quantity: 2 }], fulfillment: "PICKUP", discountCents: 500, placedAt: "2026-09-30T15:00:00.000Z" }

function post(body: unknown, init: { origin?: string; cookie?: string } = {}): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/orders/quote`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: new Headers({ "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", ...(init.cookie === "" ? {} : { cookie: init.cookie ?? "bl_access=owner-token" }) }),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("POST /api/stores/[slug]/orders/quote", () => {
  it("forwards the sale whole with the owner's token, and answers the API's price of it", async () => {
    const priced = { lines: [], subtotalCents: 20000, promotionDiscountCents: 2500, firstPurchase: null, coupon: null, couponDiscountCents: 0, manualDiscountCents: 500, discountCents: 3000, deliveryFeeCents: 0, totalCents: 17000 }
    const fetchSpy = vi.fn(async () => Response.json(priced))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(post(sale), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(priced)
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/api/stores/${SLUG}/orders/quote`)
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer owner-token")
    expect(JSON.parse(String(init.body))).toEqual(sale)
  })

  it("passes a refusal through as it came: a discount larger than what the promotions left", async () => {
    const refusal = { statusCode: 400, errorCode: "ORDER_DISCOUNT_TOO_LARGE", message: "x" }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(refusal, { status: 400 })))

    const response = await POST(post(sale), context)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(refusal)
  })

  it("answers signed out without calling the API, and refuses another site", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    expect((await POST(post(sale, { cookie: "" }), context)).status).toBe(401)
    expect((await POST(post(sale, { origin: "https://evil.example" }), context)).status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
