// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomDomainOverview } from "@harness-monorepo/contracts"

// App
import { POST } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const PATH = "/api/stores/lessari/custom-domain/check"
/** A documentation address (RFC 5737): nobody's server. */
const TARGET = "203.0.113.10"

const active: CustomDomainOverview = {
  targetIps: [TARGET],
  domain: { host: "lessari.com.br", status: "ACTIVE", checkedAt: "2026-10-08T12:00:00.000Z", problem: null },
  check: { problem: null, addresses: [TARGET], www: { problem: null, addresses: [TARGET] } },
}

function request(init: { origin?: string; signedIn?: boolean } = {}) {
  return new NextRequest(`http://localhost:3000${PATH}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", ...(init.signedIn === false ? {} : { cookie: "bl_access=owner-access" }) },
  })
}

const shop = { params: Promise.resolve({ slug: "lessari" }) }

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("checking the shop's own domain again (BEELINK-285)", () => {
  it("asks the API as the owner, and answers the domain as it then stands", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(active))
    vi.stubGlobal("fetch", fetched)

    const response = await POST(request(), shop)

    expect([response.status, await response.json()]).toEqual([200, active])
    expect(fetched.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api/, ""), init?.method])).toEqual([["/stores/lessari/custom-domain/check", "POST"]])
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  /** A check may turn a pending domain active, and the shop's public data says which it is. */
  it("drops the shop window's cache once the check was run, and never when it was refused", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json(active)))
    await POST(request(), shop)
    expect(revalidateStore).toHaveBeenCalledExactlyOnceWith("lessari")

    for (const [status, errorCode] of [[409, "CUSTOM_DOMAIN_NOT_SET"], [503, "CUSTOM_DOMAIN_UNAVAILABLE"], [429, "RATE_LIMITED"]] as const) {
      vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: status, errorCode, message: "x" }, { status })))
      const silent = await POST(request(), shop)
      expect([silent.status, (await silent.json()).errorCode]).toEqual([status, errorCode])
    }
    expect(revalidateStore).toHaveBeenCalledTimes(1)
  })

  it("refuses another site, and whoever is not signed in, before the API is asked", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(active))
    vi.stubGlobal("fetch", fetched)

    expect((await POST(request({ origin: "https://evil.example" }), shop)).status).toBe(403)
    expect((await POST(request({ signedIn: false }), shop)).status).toBe(401)
    expect(fetched).not.toHaveBeenCalled()
    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
