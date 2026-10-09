// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomDomainOverview } from "@harness-monorepo/contracts"

// App
import { DELETE, GET, PUT } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const PATH = "/api/stores/lessari/custom-domain"
/** A documentation address (RFC 5737): nobody's server. */
const TARGET = "203.0.113.10"

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
const pending: CustomDomainOverview = {
  targetIps: [TARGET],
  domain: { host: "lessari.com.br", status: "PENDING", checkedAt: "2026-10-08T12:00:00.000Z", problem: "DNS_NOT_FOUND" },
  check: { problem: "DNS_NOT_FOUND", addresses: [], www: { problem: "DNS_NOT_FOUND", addresses: [] } },
}
const taken = { statusCode: 409, errorCode: "CUSTOM_DOMAIN_TAKEN", message: "x" }

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("the shop's own domain, for the panel (BEELINK-285)", () => {
  it("reads, saves the domain as it was pasted and removes it at the API, as the owner", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(pending)))
    vi.stubGlobal("fetch", fetched)

    const read = await GET(request(), shop)
    expect([read.status, await read.json()]).toEqual([200, pending])
    const saved = await PUT(request({ method: "PUT", body: { domain: "https://www.Lessari.com.br/" } }), shop)
    expect([saved.status, await saved.json()]).toEqual([200, pending])
    const removed = await DELETE(request({ method: "DELETE" }), shop)
    expect([removed.status, await removed.json()]).toEqual([200, {}])

    expect(fetched.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api/, ""), init?.method])).toEqual([
      ["/stores/lessari/custom-domain", "GET"],
      ["/stores/lessari/custom-domain", "PUT"],
      ["/stores/lessari/custom-domain", "DELETE"],
    ])
    // Nothing is read down to a host here: the API alone decides what a domain is.
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ domain: "https://www.Lessari.com.br/" })
    expect(new Headers(fetched.mock.calls[1]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  /** The domain rides the shop's public data, kept under `store:<slug>`: a write that took drops it. */
  it("drops the shop window's cache when the domain changes, and never on a read or a refusal", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(pending))))

    await GET(request(), shop)
    expect(revalidateStore).not.toHaveBeenCalled()
    await PUT(request({ method: "PUT", body: { domain: "lessari.com.br" } }), shop)
    expect(revalidateStore).toHaveBeenLastCalledWith("lessari")
    await DELETE(request({ method: "DELETE" }), shop)
    expect(revalidateStore).toHaveBeenCalledTimes(2)

    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json(taken, { status: 409 })))
    await PUT(request({ method: "PUT", body: { domain: "outra.com.br" } }), shop)
    await DELETE(request({ method: "DELETE" }), shop)
    expect(revalidateStore).toHaveBeenCalledTimes(2)
  })

  it.each([
    [409, "CUSTOM_DOMAIN_TAKEN"],
    [400, "CUSTOM_DOMAIN_INVALID"],
    [503, "CUSTOM_DOMAIN_UNAVAILABLE"],
  ])("answers the API's refusal as it came: %i %s", async (status, errorCode) => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: status, errorCode, message: "x" }, { status })))

    const response = await PUT(request({ method: "PUT", body: { domain: "lessari.com.br" } }), shop)

    expect([response.status, (await response.json()).errorCode]).toEqual([status, errorCode])
  })

  it("sends an empty body, for the API to refuse, when what arrived is no JSON at all", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ statusCode: 400, errorCode: "BAD_REQUEST", message: "x" }, { status: 400 }))
    vi.stubGlobal("fetch", fetched)

    const response = await PUT(new NextRequest(`http://localhost:3000${PATH}`, { method: "PUT", headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: "bl_access=owner-access" }, body: "lessari.com.br" }), shop)

    expect(response.status).toBe(400)
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual({})
  })

  it("refuses another site, a body that is not JSON, or no session, before calling anything", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({}))
    vi.stubGlobal("fetch", fetched)

    for (const handler of [GET, PUT, DELETE]) {
      expect((await handler(request({ method: "PUT", body: { domain: "lessari.com.br" }, origin: "https://evil.test" }), shop)).status).toBe(403)
      expect((await handler(request({ method: "PUT", body: { domain: "lessari.com.br" }, contentType: "text/plain" }), shop)).status).toBe(415)
      expect((await handler(request({ method: "PUT", body: { domain: "lessari.com.br" }, signedIn: false }), shop)).status).toBe(401)
    }
    expect(fetched).not.toHaveBeenCalled()
    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
