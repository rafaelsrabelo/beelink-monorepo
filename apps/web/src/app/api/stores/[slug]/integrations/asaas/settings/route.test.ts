// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET, PUT } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const PATH = "/api/stores/lessari/integrations/asaas/settings"
const CHOICES = { pix: true, card: true, maxInstallments: 6, offline: false }

function request(init: { method?: string; body?: object; origin?: string; signedIn?: boolean; json?: boolean } = {}) {
  return new NextRequest(`http://localhost:3000${PATH}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.json === false ? {} : { "content-type": "application/json" }),
      origin: init.origin ?? "http://localhost:3000",
      ...(init.signedIn === false ? {} : { cookie: "bl_access=owner-access" }),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const shop = { params: Promise.resolve({ slug: "lessari" }) }

afterEach(() => vi.unstubAllGlobals())

describe("how the shop is paid through Asaas, for the panel (BEELINK-203)", () => {
  it("reads and saves the choices at the API, as the owner, the body as it came", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ ...CHOICES, updatedAt: "2026-10-05T12:00:00.000Z" }))
    vi.stubGlobal("fetch", fetched)

    const read = await GET(request(), shop)
    expect([read.status, await read.json()]).toEqual([200, { ...CHOICES, updatedAt: "2026-10-05T12:00:00.000Z" }])
    expect((await PUT(request({ method: "PUT", body: CHOICES }), shop)).status).toBe(200)

    expect(fetched.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api/, ""), init?.method])).toEqual([
      ["/stores/lessari/integrations/asaas/settings", "GET"],
      ["/stores/lessari/integrations/asaas/settings", "PUT"],
    ])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual(CHOICES)
    for (const [, init] of fetched.mock.calls) expect(new Headers(init?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  it("answers the API's refusal as it came", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 400, errorCode: "ASAAS_SETTINGS_INVALID", message: "x" }, { status: 400 })))

    const response = await PUT(request({ method: "PUT", body: { ...CHOICES, maxInstallments: 13 } }), shop)

    expect([response.status, (await response.json()).errorCode]).toEqual([400, "ASAAS_SETTINGS_INVALID"])
  })

  it("refuses another site, a request that does not speak JSON, or no session, before calling anything", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({}))
    vi.stubGlobal("fetch", fetched)

    expect((await PUT(request({ method: "PUT", body: CHOICES, origin: "https://evil.test" }), shop)).status).toBe(403)
    expect((await GET(request({ origin: "https://evil.test" }), shop)).status).toBe(403)
    expect((await PUT(request({ method: "PUT", body: CHOICES, json: false }), shop)).status).toBe(415)
    expect((await PUT(request({ method: "PUT", body: CHOICES, signedIn: false }), shop)).status).toBe(401)
    expect((await GET(request({ signedIn: false }), shop)).status).toBe(401)
    expect(fetched).not.toHaveBeenCalled()
  })
})
