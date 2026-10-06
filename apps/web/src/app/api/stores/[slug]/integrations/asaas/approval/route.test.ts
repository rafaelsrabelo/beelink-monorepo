// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const PATH = "/api/stores/lessari/integrations/asaas/approval"
const APPROVED = { available: true, environment: "PRODUCTION", status: "CONNECTED", account: { name: "Lessari", document: null }, webhook: "REGISTERED", approval: "APPROVED", approvalCheckedAt: "2026-10-06T21:00:00.000Z", connectedAt: "2026-10-05T12:00:00.000Z" }

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

describe("asking Asaas again whether it approved the shop's account (BEELINK-278)", () => {
  it("asks the API as the owner, and answers the connection as it then stands", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(APPROVED))
    vi.stubGlobal("fetch", fetched)

    const response = await POST(request(), shop)

    expect([response.status, await response.json()]).toEqual([200, APPROVED])
    expect(fetched.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api/, ""), init?.method])).toEqual([["/stores/lessari/integrations/asaas/approval", "POST"]])
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  /** The checkout offers Pix and card by this answer: kept, it would go on offering nothing to a shop just approved. */
  it("drops the shop window's cache once Asaas was heard, and never when it was not", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json(APPROVED)))
    await POST(request(), shop)
    expect(revalidateStore).toHaveBeenCalledExactlyOnceWith("lessari")

    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 502, errorCode: "INTEGRATION_UNREACHABLE", message: "x" }, { status: 502 })))
    const silent = await POST(request(), shop)
    expect([silent.status, (await silent.json()).errorCode]).toEqual([502, "INTEGRATION_UNREACHABLE"])
    expect(revalidateStore).toHaveBeenCalledTimes(1)
  })

  it("refuses another site, and whoever is not signed in, before the API is asked", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(APPROVED))
    vi.stubGlobal("fetch", fetched)

    expect((await POST(request({ origin: "https://evil.example" }), shop)).status).toBe(403)
    expect((await POST(request({ signedIn: false }), shop)).status).toBe(401)
    expect(fetched).not.toHaveBeenCalled()
    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
