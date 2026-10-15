// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST as check } from "./check/route"
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

  /** Nothing a visitor is served reads where a page stands with bee-link yet. */
  it("drops nothing the shop window kept", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json(answer)))

    await PUT(request("/api/stores/loja/subscription", { method: "PUT", body: { cycle: "MONTHLY" } }), shop)
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
