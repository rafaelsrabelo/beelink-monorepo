// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET, POST } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const PENDING = { payment: { status: "PENDING", method: "PIX", installments: 1, amountCents: 5990, refundedCents: 0, expiresAt: "2026-10-08T02:59:59.999Z", paidAt: null, pix: { payload: "000201", image: "aGk=", expiresAt: "2026-10-08T02:59:59.999Z" }, invoiceUrl: null } }

function call(handler: typeof GET, method: "GET" | "POST", number: string, init: { origin?: string; cookie?: string; contentType?: string; ip?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": init.contentType ?? "application/json", origin: init.origin ?? "http://localhost:3000" })
  if (init.cookie !== "") headers.set("cookie", init.cookie ?? "bl_shopper_access=shopper-access")
  if (init.ip) headers.set("x-forwarded-for", init.ip)

  const request = new NextRequest(`http://localhost:3000/${slug}/api/orders/${number}/payment`, { method, headers, ...(method === "POST" ? { body: "{}" } : {}) })
  return handler(request, { params: Promise.resolve({ slug, number }) })
}

const urlOf = (fetched: ReturnType<typeof vi.fn<Fetched>>, index = 0) => String(fetched.mock.calls[index]?.[0])
const initOf = (fetched: ReturnType<typeof vi.fn<Fetched>>, index = 0) => fetched.mock.calls[index]?.[1]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the payment of one of the shopper's orders (BEELINK-205)", () => {
  it("reads the charge at the API as the shopper, and answers it as it came", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(PENDING))
    vi.stubGlobal("fetch", fetched)

    const response = await call(GET, "GET", "12")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(PENDING)
    expect(urlOf(fetched)).toMatch(/\/stores\/loja\/customer\/orders\/12\/payment$/)
    expect(initOf(fetched)?.method).toBe("GET")
    expect(new Headers(initOf(fetched)?.headers).get("authorization")).toBe("Bearer shopper-access")
  })

  it("makes the charge at the API as the shopper, sending nothing of its own and the visitor's address along", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(PENDING))
    vi.stubGlobal("fetch", fetched)

    const response = await call(POST, "POST", "12", { ip: "203.0.113.9" })

    expect(response.status).toBe(200)
    expect(urlOf(fetched)).toMatch(/\/stores\/loja\/customer\/orders\/12\/payment$/)
    expect(initOf(fetched)?.method).toBe("POST")
    expect(JSON.parse(String(initOf(fetched)?.body))).toEqual({})
    expect(new Headers(initOf(fetched)?.headers).get("x-forwarded-for")).toBe("203.0.113.9")
  })

  it.each([
    [409, "PAYMENT_IN_PROGRESS"],
    [409, "PAYMENT_AWAITING_TOTAL"],
    [502, "PAYMENT_REFUSED"],
    [503, "PAYMENT_UNAVAILABLE"],
    [429, "RATE_LIMITED"],
  ])("passes a refusal through as it came: %i %s", async (statusCode, errorCode) => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode, errorCode, message: "x" }, { status: statusCode })))

    const response = await call(POST, "POST", "12")

    expect(response.status).toBe(statusCode)
    expect(await response.json()).toMatchObject({ errorCode })
  })

  it("answers signed out, cookies cleared, when no session is left", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 })))

    for (const response of [await call(GET, "GET", "12", { cookie: "bl_shopper_access=old" }), await call(POST, "POST", "12", { cookie: "bl_shopper_access=old" })]) {
      expect(response.status).toBe(401)
      expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
    }
  })

  it("says the shop could not be reached when the API does not answer", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Promise.reject(new Error("down"))))

    const response = await call(GET, "GET", "12")

    expect([response.status, (await response.json()).errorCode]).toEqual([502, "UNKNOWN"])
  })

  it("refuses another site, a plain form, a slug that is none and a number that is none, before calling anything", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    for (const [handler, method] of [[GET, "GET"], [POST, "POST"]] as const) {
      expect((await call(handler, method, "12", { origin: "https://outro.site" })).status).toBe(403)
      expect((await call(handler, method, "12", { contentType: "application/x-www-form-urlencoded" })).status).toBe(415)
      expect((await call(handler, method, "12", {}, "../stores")).status).toBe(404)
      expect((await call(handler, method, "abc")).status).toBe(404)
    }
    expect(fetched).not.toHaveBeenCalled()
  })
})
