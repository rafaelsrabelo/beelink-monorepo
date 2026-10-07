// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { DELETE, GET, POST } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const PATH = "/api/stores/lessari/integrations/google-analytics"
const ID = "G-AB12CD34EF"

function request(init: { method?: string; body?: object; origin?: string; signedIn?: boolean; contentType?: string } = {}) {
  return new NextRequest(`http://localhost:3000${PATH}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": init.contentType ?? "application/json",
      origin: init.origin ?? "http://localhost:3000",
      ...(init.signedIn === false ? {} : { cookie: "bl_access=owner-access" }),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const shop = { params: Promise.resolve({ slug: "lessari" }) }
const connected = { status: "CONNECTED", measurementId: ID, connectedAt: "2026-10-06T12:00:00.000Z" }

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("the shop's Google Analytics, for the panel (BEELINK-302)", () => {
  it("reads, saves the ID and removes it at the API, as the owner", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(connected)))
    vi.stubGlobal("fetch", fetched)

    const read = await GET(request(), shop)
    expect([read.status, await read.json()]).toEqual([200, connected])
    expect((await POST(request({ method: "POST", body: { measurementId: ID } }), shop)).status).toBe(200)
    const removed = await DELETE(request({ method: "DELETE" }), shop)
    expect([removed.status, await removed.json()]).toEqual([200, {}])

    expect(fetched.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api/, ""), init?.method])).toEqual([
      ["/stores/lessari/integrations/google-analytics", "GET"],
      ["/stores/lessari/integrations/google-analytics", "POST"],
      ["/stores/lessari/integrations/google-analytics", "DELETE"],
    ])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ measurementId: ID })
    expect(new Headers(fetched.mock.calls[1]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  /** The ID rides the shop's public data, kept under `store:<slug>`: a write that took drops it. */
  it("drops the shop window's cache when the ID changes, and never on a read or a refusal", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(connected))))

    await GET(request(), shop)
    expect(revalidateStore).not.toHaveBeenCalled()
    await POST(request({ method: "POST", body: { measurementId: ID } }), shop)
    expect(revalidateStore).toHaveBeenLastCalledWith("lessari")
    await DELETE(request({ method: "DELETE" }), shop)
    expect(revalidateStore).toHaveBeenCalledTimes(2)

    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 400, errorCode: "GOOGLE_ANALYTICS_ID_INVALID", message: "x" }, { status: 400 })))
    await POST(request({ method: "POST", body: { measurementId: "<script>" } }), shop)
    await DELETE(request({ method: "DELETE" }), shop)
    expect(revalidateStore).toHaveBeenCalledTimes(2)
  })

  it("answers the API's refusal as it came", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 400, errorCode: "GOOGLE_ANALYTICS_ID_INVALID", message: "x" }, { status: 400 })))

    const response = await POST(request({ method: "POST", body: { measurementId: "UA-12345-1" } }), shop)

    expect([response.status, (await response.json()).errorCode]).toEqual([400, "GOOGLE_ANALYTICS_ID_INVALID"])
  })

  it("refuses another site, a body that is not JSON, or no session, before calling anything", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({}))
    vi.stubGlobal("fetch", fetched)

    for (const handler of [GET, POST, DELETE]) {
      expect((await handler(request({ method: "POST", body: { measurementId: ID }, origin: "https://evil.test" }), shop)).status).toBe(403)
      expect((await handler(request({ method: "POST", body: { measurementId: ID }, contentType: "text/plain" }), shop)).status).toBe(415)
      expect((await handler(request({ method: "POST", body: { measurementId: ID }, signedIn: false }), shop)).status).toBe(401)
    }
    expect(fetched).not.toHaveBeenCalled()
    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
