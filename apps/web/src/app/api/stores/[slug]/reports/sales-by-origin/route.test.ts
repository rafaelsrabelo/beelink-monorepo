// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const PATH = "/api/stores/lessari/reports/sales-by-origin"

function request(init: { search?: string; origin?: string; signedIn?: boolean; contentType?: string } = {}) {
  return new NextRequest(`http://localhost:3000${PATH}${init.search ?? ""}`, {
    method: "GET",
    headers: {
      "content-type": init.contentType ?? "application/json",
      origin: init.origin ?? "http://localhost:3000",
      "x-forwarded-for": "203.0.113.9",
      ...(init.signedIn === false ? {} : { cookie: "bl_access=owner-access" }),
    },
  })
}

const shop = { params: Promise.resolve({ slug: "lessari" }) }
const report = { from: "2026-09-30", to: "2026-10-06", rows: [{ kind: "DIRECT", source: null, medium: null, campaign: null, orders: 1, metaAdOrders: 0, revenueCents: 5990 }], totals: { orders: 1, revenueCents: 5990 } }

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("a shop's sales by origin, for the panel (BEELINK-275)", () => {
  it("reads the period at the API as the owner, with the query as it came, and answers what the API said", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(report))
    vi.stubGlobal("fetch", fetched)

    const response = await GET(request({ search: "?from=2026-09-30&to=2026-10-06" }), shop)

    expect([response.status, await response.json()]).toEqual([200, report])
    expect(fetched.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api/, ""), init?.method])).toEqual([["/stores/lessari/reports/sales-by-origin?from=2026-09-30&to=2026-10-06", "GET"]])
    const headers = new Headers(fetched.mock.calls[0]?.[1]?.headers)
    expect(headers.get("authorization")).toBe("Bearer owner-access")
    // The API's per-IP limit has to see the person, not this server.
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.9")
  })

  it("reads with no period too: the API picks the thirty days", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(report))
    vi.stubGlobal("fetch", fetched)

    await GET(request(), shop)

    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/lessari\/reports\/sales-by-origin$/)
  })

  it.each([
    [400, "REPORT_PERIOD_INVALID"],
    [403, "STORE_FORBIDDEN"],
    [404, "STORE_NOT_FOUND"],
  ])("answers the API's %i as it came", async (status, errorCode) => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: status, errorCode, message: "x" }, { status })))

    const response = await GET(request({ search: "?from=2026-10-02&to=2026-10-01" }), shop)

    expect([response.status, (await response.json()).errorCode]).toEqual([status, errorCode])
  })

  it("refuses another site, a call that does not say it speaks JSON, or no session, before calling anything", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({}))
    vi.stubGlobal("fetch", fetched)

    expect((await GET(request({ origin: "https://evil.test" }), shop)).status).toBe(403)
    expect((await GET(request({ contentType: "text/plain" }), shop)).status).toBe(415)
    expect((await GET(request({ signedIn: false }), shop)).status).toBe(401)
    expect(fetched).not.toHaveBeenCalled()
  })

  it("drops nothing the shop window cached: a read changes nothing a visitor is served", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json(report)))

    await GET(request(), shop)

    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
