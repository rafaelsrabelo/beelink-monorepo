// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET as plans } from "../plans/route"
import { GET, PUT } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(path: string, init: { method?: string; body?: object; origin?: string; signedIn?: boolean } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      origin: init.origin ?? "http://localhost:3000",
      "x-forwarded-for": "203.0.113.9",
      ...(init.signedIn === false ? {} : { cookie: "bl_access=owner-access" }),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("the plans and the account's billing data, for the panel (BEELINK-293)", () => {
  it("reads the plans on sale at the API, as the signed-in shopkeeper", async () => {
    const catalog = { trialDays: 7, plans: [] }
    const fetched = vi.fn<Fetched>(async () => Response.json(catalog))
    vi.stubGlobal("fetch", fetched)

    const response = await plans(request("/api/billing/plans"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(catalog)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/billing\/plans$/)
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("GET")
  })

  it("reads and keeps the billing data at the API as the owner, the body as it came and the shopkeeper's address beside it", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "PUT" ? { name: "Maria", document: "***.982.247-**", documentType: "CPF", customerReady: true } : { account: null }))
    vi.stubGlobal("fetch", fetched)
    const typed = { name: "Maria Souza Lima", document: "529.982.247-25" }

    expect(await (await GET(request("/api/billing/account"))).json()).toEqual({ account: null })
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/billing\/account$/)
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")

    expect((await PUT(request("/api/billing/account", { method: "PUT", body: typed }))).status).toBe(200)
    expect(fetched.mock.calls[1]?.[1]?.method).toBe("PUT")
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual(typed)
    // The API's limit of writes is per address: it has to see the shopkeeper's, not this server's.
    expect(new Headers(fetched.mock.calls[1]?.[1]?.headers).get("x-forwarded-for")).toBe("203.0.113.9")
  })

  it("answers the API's refusal as it came", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 400, errorCode: "BILLING_DOCUMENT_INVALID", message: "x" }, { status: 400 })))

    const response = await PUT(request("/api/billing/account", { method: "PUT", body: { name: "Maria", document: "1" } }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ errorCode: "BILLING_DOCUMENT_INVALID" })
  })

  it("refuses a request from another site, and one with no session, before asking the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await PUT(request("/api/billing/account", { method: "PUT", body: {}, origin: "https://outro.site" }))).status).toBe(403)
    expect((await plans(request("/api/billing/plans", { origin: "https://outro.site" }))).status).toBe(403)
    expect((await GET(request("/api/billing/account", { signedIn: false }))).status).toBe(401)
    expect(fetched).not.toHaveBeenCalled()
  })
})
