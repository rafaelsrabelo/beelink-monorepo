// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET as readPage } from "./[storeSlug]/[read]/route"
import { PATCH as saveProfile } from "./[storeSlug]/profile/route"
import { GET as readHome } from "./[storeSlug]/route"
import { GET as listShops } from "./route"

const mocks = vi.hoisted(() => ({ revalidateStore: vi.fn() }))
vi.mock("@/lib/revalidate", () => ({ revalidateStore: mocks.revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(path: string, init: { method?: string; body?: object; origin?: string } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", cookie: "bl_access=affiliate-access" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const shop = { params: Promise.resolve({ storeSlug: "loja da ana" }) }
const reading = (read: string) => ({ params: Promise.resolve({ storeSlug: "loja", read }) })

afterEach(() => {
  vi.unstubAllGlobals()
  mocks.revalidateStore.mockReset()
})

describe("the affiliate's own area, through this app (IMPULSEIA-108)", () => {
  it("lists the account's shops and reads one, the slug escaped, with the account's own token", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json([]))
    vi.stubGlobal("fetch", fetched)

    expect((await listShops(request("/api/affiliate/stores"))).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/affiliate\/stores$/)
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer affiliate-access")

    await readHome(request("/api/affiliate/stores/loja%20da%20ana"), shop)
    expect(String(fetched.mock.calls[1]?.[0])).toMatch(/\/affiliate\/stores\/loja%20da%20ana$/)
  })

  it.each(["products", "orders", "statement", "payouts"])("reads %s with the page and the search, and nothing else the address carried", async (read) => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ total: 0 }))
    vi.stubGlobal("fetch", fetched)

    expect((await readPage(request(`/api/affiliate/stores/loja/${read}?page=2&q=whey&evil=1`), reading(read))).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(new RegExp(`/affiliate/stores/loja/${read}\\?page=2&q=whey$`))
  })

  it("answers a page that is not the area's as not found, and never asks the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    const response = await readPage(request("/api/affiliate/stores/loja/admin"), reading("admin"))
    expect(response.status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })

  it("saves the affiliate's data and drops the shop window's tag only when it was saved", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ tagline: "Oi" }))
    vi.stubGlobal("fetch", fetched)

    expect((await saveProfile(request("/api/affiliate/stores/loja/profile", { method: "PATCH", body: { tagline: "Oi" } }), reading("profile"))).status).toBe(200)
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("PATCH")
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual({ tagline: "Oi" })
    expect(mocks.revalidateStore).toHaveBeenCalledWith("loja")

    fetched.mockResolvedValueOnce(Response.json({ errorCode: "AFFILIATE_PROFILE_INVALID" }, { status: 400 }))
    mocks.revalidateStore.mockReset()
    expect((await saveProfile(request("/api/affiliate/stores/loja/profile", { method: "PATCH", body: { pixKey: "x" } }), reading("profile"))).status).toBe(400)
    expect(mocks.revalidateStore).not.toHaveBeenCalled()
  })

  it("refuses a request from another site before asking anything", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await listShops(request("/api/affiliate/stores", { origin: "https://evil.example" }))).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})
