// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST as check } from "./check/route"
import { POST as coupon } from "./coupon/route"
import { GET, PUT } from "./route"

const mocks = vi.hoisted(() => ({ revalidateStore: vi.fn() }))
vi.mock("@/lib/revalidate", () => ({ revalidateStore: mocks.revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(path: string, init: { method?: string; body?: object; origin?: string } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", cookie: "bl_access=owner-access", "x-forwarded-for": "203.0.113.9" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const shop = { params: Promise.resolve({ slug: "loja da ana" }) }
const answer = { billingEnforced: true, subscription: null }

afterEach(() => {
  vi.unstubAllGlobals()
  mocks.revalidateStore.mockReset()
})

describe("a page's subscription, for the panel (BEELINK-293)", () => {
  it("reads it, chooses the cycle and asks whether it was paid, at the API, as the owner, the slug escaped", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(answer))
    vi.stubGlobal("fetch", fetched)

    expect((await GET(request("/api/stores/loja%20da%20ana/subscription"), shop)).status).toBe(200)
    expect((await PUT(request("/api/stores/loja%20da%20ana/subscription", { method: "PUT", body: { cycle: "ANNUAL" } }), shop)).status).toBe(200)
    expect((await check(request("/api/stores/loja%20da%20ana/subscription/check", { method: "POST" }), shop)).status).toBe(200)

    expect(fetched.mock.calls.map(([url, init]) => `${init?.method} ${String(url).replace(/^.*\/api/, "")}`)).toEqual([
      "GET /stores/loja%20da%20ana/subscription",
      "PUT /stores/loja%20da%20ana/subscription",
      "POST /stores/loja%20da%20ana/subscription/check",
    ])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ cycle: "ANNUAL" })
    for (const [, init] of fetched.mock.calls) {
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer owner-access")
      // Both writes are limited per address at the API: it has to see the shopkeeper's.
      expect(new Headers(init?.headers).get("x-forwarded-for")).toBe("203.0.113.9")
    }
  })

  /** A choice never moves where a page stands, and a check that reads it unpaid moves nothing a visitor is served. */
  it("drops nothing the shop window kept while the page is not read paid", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ billingEnforced: true, subscription: { status: "TRIAL_EXPIRED", lock: "TRIAL_EXPIRED" } })))

    await GET(request("/api/stores/loja/subscription"), shop)
    await PUT(request("/api/stores/loja/subscription", { method: "PUT", body: { cycle: "MONTHLY" } }), shop)
    await check(request("/api/stores/loja/subscription/check", { method: "POST" }), shop)

    expect(mocks.revalidateStore).not.toHaveBeenCalled()
  })

  /** BEELINK-223: a page off the air a moment ago is served again at once to the shopkeeper who just paid. */
  it("drops the shop window's cache when a check reads the page paid", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ billingEnforced: true, subscription: { status: "ACTIVE", lock: null } })))

    await check(request("/api/stores/loja%20da%20ana/subscription/check", { method: "POST" }), shop)

    expect(mocks.revalidateStore).toHaveBeenCalledExactlyOnceWith("loja da ana")
  })

  it("drops nothing when the check could not be made", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 503, errorCode: "BILLING_UNREACHABLE", message: "x" }, { status: 503 })))

    await check(request("/api/stores/loja/subscription/check", { method: "POST" }), shop)

    expect(mocks.revalidateStore).not.toHaveBeenCalled()
  })

  it.each([
    [409, "BILLING_ACCOUNT_REQUIRED"],
    [503, "BILLING_UNREACHABLE"],
    [429, "RATE_LIMITED"],
  ])("answers the API's %i %s as it came", async (status, errorCode) => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: status, errorCode, message: "x" }, { status })))

    const response = await PUT(request("/api/stores/loja/subscription", { method: "PUT", body: { cycle: "MONTHLY" } }), shop)

    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ errorCode })
  })

  it("refuses a request from another site before asking the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await PUT(request("/api/stores/loja/subscription", { method: "PUT", body: { cycle: "MONTHLY" }, origin: "https://outro.site" }), shop)).status).toBe(403)
    expect((await check(request("/api/stores/loja/subscription/check", { method: "POST", origin: "https://outro.site" }), shop)).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})

describe("a coupon of bee-link's, for the panel (BEELINK-224)", () => {
  it("sends the code at the API, as the owner and from the shopkeeper's address, the slug escaped", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(answer))
    vi.stubGlobal("fetch", fetched)

    expect((await coupon(request("/api/stores/loja%20da%20ana/subscription/coupon", { method: "POST", body: { code: "TESTE-UM" } }), shop)).status).toBe(200)

    const [url, init] = fetched.mock.calls[0]!
    expect(`${init?.method} ${String(url).replace(/^.*\/api/, "")}`).toBe("POST /stores/loja%20da%20ana/subscription/coupon")
    expect(JSON.parse(String(init?.body))).toEqual({ code: "TESTE-UM" })
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer owner-access")
    // Limited per address at the API, like a sign-in: it has to see the shopkeeper's.
    expect(new Headers(init?.headers).get("x-forwarded-for")).toBe("203.0.113.9")
  })

  /** BEELINK-223: a page given its month may have been off the air, and is served again at once. */
  it("drops the shop window's cache when the coupon is taken", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ billingEnforced: true, subscription: { status: "TRIAL_EXPIRED", lock: null } })))

    await coupon(request("/api/stores/loja%20da%20ana/subscription/coupon", { method: "POST", body: { code: "TESTE-UM" } }), shop)

    expect(mocks.revalidateStore).toHaveBeenCalledExactlyOnceWith("loja da ana")
  })

  it.each([
    [409, "BILLING_COUPON_EXHAUSTED"],
    [503, "BILLING_UNREACHABLE"],
    [429, "RATE_LIMITED"],
  ])("answers the API's %i %s as it came, and drops nothing", async (status, errorCode) => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: status, errorCode, message: "x" }, { status })))

    const response = await coupon(request("/api/stores/loja/subscription/coupon", { method: "POST", body: { code: "TESTE-UM" } }), shop)

    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ errorCode })
    expect(mocks.revalidateStore).not.toHaveBeenCalled()
  })

  it("refuses a request from another site before asking the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await coupon(request("/api/stores/loja/subscription/coupon", { method: "POST", body: { code: "TESTE-UM" }, origin: "https://outro.site" }), shop)).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})
