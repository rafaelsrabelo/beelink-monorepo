// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { DELETE, POST } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const PATH = "/api/stores/lessari/integrations/meta-pixel/token"
/** The shape of a token, and nobody's. */
const TOKEN = "EAABnobodys0token0000000000000000000000"

function request(init: { method?: string; body?: object; origin?: string; signedIn?: boolean; contentType?: string } = {}) {
  return new NextRequest(`http://localhost:3000${PATH}`, {
    method: init.method ?? "POST",
    headers: {
      "content-type": init.contentType ?? "application/json",
      origin: init.origin ?? "http://localhost:3000",
      ...(init.signedIn === false ? {} : { cookie: "bl_access=owner-access" }),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const shop = { params: Promise.resolve({ slug: "lessari" }) }
const connected = { status: "CONNECTED", pixelId: "1234567890123456", connectedAt: "2026-10-06T12:00:00.000Z", conversions: { available: true, token: "SET", refusal: null, refusedAt: null } }

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("the pixel's Conversions API token, for the panel (BEELINK-274)", () => {
  it("saves and removes the token at the API, as the owner, with the body as it came", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(connected)))
    vi.stubGlobal("fetch", fetched)

    const saved = await POST(request({ body: { accessToken: TOKEN } }), shop)
    expect([saved.status, await saved.json()]).toEqual([200, connected])
    const removed = await DELETE(request({ method: "DELETE" }), shop)
    expect([removed.status, await removed.json()]).toEqual([200, {}])

    expect(fetched.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api/, ""), init?.method])).toEqual([
      ["/stores/lessari/integrations/meta-pixel/token", "POST"],
      ["/stores/lessari/integrations/meta-pixel/token", "DELETE"],
    ])
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual({ accessToken: TOKEN })
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
    // The token rides the body alone: never the address the API is called by.
    expect(String(fetched.mock.calls[0]?.[0])).not.toContain(TOKEN)
  })

  /** Nothing the shop window is served changes with a token: its cache stays. */
  it("drops no cache of the shop window", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(connected))))

    await POST(request({ body: { accessToken: TOKEN } }), shop)
    await DELETE(request({ method: "DELETE" }), shop)

    expect(revalidateStore).not.toHaveBeenCalled()
  })

  it.each([
    [400, "META_PIXEL_TOKEN_INVALID"],
    [409, "INTEGRATION_NOT_CONNECTED"],
    [503, "INTEGRATION_UNAVAILABLE"],
  ] as const)("answers the API's refusal (%i %s) as it came, and echoes no token", async (status, errorCode) => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: status, errorCode, message: "x" }, { status })))

    const response = await POST(request({ body: { accessToken: TOKEN } }), shop)
    const body = await response.json()

    expect([response.status, body.errorCode]).toEqual([status, errorCode])
    expect(JSON.stringify(body)).not.toContain(TOKEN)
  })

  it("refuses another site, a body that is not JSON, or no session, before calling anything", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({}))
    vi.stubGlobal("fetch", fetched)

    for (const handler of [POST, DELETE]) {
      expect((await handler(request({ body: { accessToken: TOKEN }, origin: "https://evil.test" }), shop)).status).toBe(403)
      expect((await handler(request({ body: { accessToken: TOKEN }, contentType: "text/plain" }), shop)).status).toBe(415)
      expect((await handler(request({ body: { accessToken: TOKEN }, signedIn: false }), shop)).status).toBe(401)
    }
    expect(fetched).not.toHaveBeenCalled()
  })
})
