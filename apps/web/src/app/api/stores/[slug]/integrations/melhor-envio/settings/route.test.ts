// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET as account } from "../account/route"
import { GET, PUT } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(path: string, init: { method?: string; body?: object; origin?: string } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", cookie: "bl_access=owner-access" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const shop = { params: Promise.resolve({ slug: "lessari" }) }

afterEach(() => vi.unstubAllGlobals())

describe("the shop's carrier settings and wallet, for the panel (BEELINK-183)", () => {
  it("reads and saves the settings, and reads the wallet, at the API as the owner", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({}))
    vi.stubGlobal("fetch", fetched)
    const body = { handlingDays: 2, serviceIds: [1, 2], defaultPackage: null }

    expect((await GET(request("/api/stores/lessari/integrations/melhor-envio/settings"), shop)).status).toBe(200)
    expect((await PUT(request("/api/stores/lessari/integrations/melhor-envio/settings", { method: "PUT", body }), shop)).status).toBe(200)
    expect((await account(request("/api/stores/lessari/integrations/melhor-envio/account"), shop)).status).toBe(200)

    expect(fetched.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api/, ""), init?.method])).toEqual([
      ["/stores/lessari/integrations/melhor-envio/settings", "GET"],
      ["/stores/lessari/integrations/melhor-envio/settings", "PUT"],
      ["/stores/lessari/integrations/melhor-envio/account", "GET"],
    ])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual(body)
    expect(new Headers(fetched.mock.calls[2]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  it("refuses another site before calling anything", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({}))
    vi.stubGlobal("fetch", fetched)

    expect((await PUT(request("/api/stores/lessari/integrations/melhor-envio/settings", { method: "PUT", body: {}, origin: "https://evil.test" }), shop)).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})
