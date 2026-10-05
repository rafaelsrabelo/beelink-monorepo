// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { DELETE, GET, POST } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const PATH = "/api/stores/lessari/integrations/asaas"
const KEY = "$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY"

function request(init: { method?: string; body?: object; origin?: string; signedIn?: boolean } = {}) {
  return new NextRequest(`http://localhost:3000${PATH}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      origin: init.origin ?? "http://localhost:3000",
      ...(init.signedIn === false ? {} : { cookie: "bl_access=owner-access" }),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const shop = { params: Promise.resolve({ slug: "lessari" }) }

afterEach(() => vi.unstubAllGlobals())

describe("the shop's Asaas connection, for the panel (BEELINK-202)", () => {
  it("reads, connects with the pasted key and disconnects at the API, as the owner", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ status: "CONNECTED" })))
    vi.stubGlobal("fetch", fetched)

    expect((await GET(request(), shop)).status).toBe(200)
    expect((await POST(request({ method: "POST", body: { apiKey: KEY } }), shop)).status).toBe(200)
    const disconnected = await DELETE(request({ method: "DELETE" }), shop)
    expect([disconnected.status, await disconnected.json()]).toEqual([200, {}])

    expect(fetched.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api/, ""), init?.method])).toEqual([
      ["/stores/lessari/integrations/asaas", "GET"],
      ["/stores/lessari/integrations/asaas", "POST"],
      ["/stores/lessari/integrations/asaas", "DELETE"],
    ])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ apiKey: KEY })
    expect(new Headers(fetched.mock.calls[1]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  it("answers the API's refusal as it came", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 400, errorCode: "INTEGRATION_KEY_WRONG_ENVIRONMENT", message: "x" }, { status: 400 })))

    const response = await POST(request({ method: "POST", body: { apiKey: "$aact_prod_x" } }), shop)

    expect([response.status, (await response.json()).errorCode]).toEqual([400, "INTEGRATION_KEY_WRONG_ENVIRONMENT"])
  })

  it("refuses another site, or no session, before calling anything", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({}))
    vi.stubGlobal("fetch", fetched)

    expect((await POST(request({ method: "POST", body: { apiKey: KEY }, origin: "https://evil.test" }), shop)).status).toBe(403)
    expect((await POST(request({ method: "POST", body: { apiKey: KEY }, signedIn: false }), shop)).status).toBe(401)
    expect(fetched).not.toHaveBeenCalled()
  })
})
