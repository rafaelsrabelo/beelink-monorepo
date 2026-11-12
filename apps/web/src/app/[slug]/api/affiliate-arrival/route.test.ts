// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

// App
import { POST } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const ID = "0199a1b2-0000-7000-8000-000000000001"
const JOAO = { id: ID, slug: "joao", name: "João Silva", photoUrl: null, tagline: null, attributionDays: 30 }
const shop = (slug = "lessari") => ({ params: Promise.resolve({ slug }) })

function request(body: unknown, headers: Record<string, string | null> = {}, slug = "lessari") {
  const all: Record<string, string | null> = { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": "203.0.113.9", ...headers }

  return new NextRequest(`http://localhost:3000/${slug}/api/affiliate-arrival`, {
    method: "POST",
    headers: Object.fromEntries(Object.entries(all).filter((entry): entry is [string, string] => entry[1] !== null)),
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

/** The API: the link's read answers `link`, the visit's count answers 204. */
function api(link: { status: number; body?: unknown } = { status: 200, body: { affiliate: JOAO } }) {
  const fetched = vi.fn<Fetched>(async (url) =>
    String(url).includes("/affiliate-link?") ? (link.body === undefined ? new Response(null, { status: link.status }) : Response.json(link.body, { status: link.status })) : new Response(null, { status: 204 }),
  )
  vi.stubGlobal("fetch", fetched)
  return fetched
}

const visits = (fetched: ReturnType<typeof api>) => fetched.mock.calls.filter(([url]) => String(url).includes("/affiliate-visits"))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("a visitor arriving by an affiliate's link (IMPULSEIA-105)", () => {
  it("asks the API whom the link names, counts the visit with the visitor's address, and keeps the affiliate and the instant", async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 12, 15), toFake: ["Date"] })
    const fetched = api()

    const response = await POST(request({ slug: "joao" }), shop())

    expect(response.status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/lessari\/affiliate-link\?slug=joao$/)
    const [url, init] = visits(fetched)[0]!
    expect([String(url).replace(/^.*\/api/, ""), init?.method, init?.body]).toEqual(["/stores/lessari/affiliate-visits", "POST", JSON.stringify({ affiliateId: ID })])
    expect(new Headers(init?.headers).get("x-forwarded-for")).toBe("203.0.113.9")

    const kept = response.cookies.get("bl_affiliate")!
    expect(kept).toMatchObject({ value: `${ID}.${Date.UTC(2026, 10, 12, 15)}`, path: "/lessari", maxAge: 30 * 24 * 60 * 60, httpOnly: true, sameSite: "lax" })
    // A new arrival shows the strip again, even one this browser had closed.
    expect(response.cookies.get("bl_affiliate_hidden")).toMatchObject({ value: "", maxAge: 0, path: "/lessari" })
  })

  it("counts a page read again as the same visit — the same affiliate, just now — and keeps its instant", async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 12, 15), toFake: ["Date"] })
    const fetched = api()
    const earlier = Date.UTC(2026, 10, 12, 14, 45)

    const again = await POST(request({ slug: "joao" }, { cookie: `bl_affiliate=${ID}.${earlier}` }), shop())
    expect(again.status).toBe(200)
    expect(visits(fetched)).toEqual([])
    expect(again.cookies.get("bl_affiliate")?.value).toBe(`${ID}.${earlier}`)

    // Half an hour on, or another affiliate's cookie, is a visit of its own.
    await POST(request({ slug: "joao" }, { cookie: `bl_affiliate=${ID}.${Date.UTC(2026, 10, 12, 14, 30)}` }), shop())
    await POST(request({ slug: "joao" }, { cookie: `bl_affiliate=0199a1b2-0000-7000-8000-000000000002.${earlier}` }), shop())
    expect(visits(fetched)).toHaveLength(2)
  })

  it("keeps it at the root of the shop's own domain", async () => {
    api()

    const response = await POST(request({ slug: "joao" }, { "x-bl-shop-domain": "lessari" }), shop())

    expect(response.cookies.get("bl_affiliate")?.path).toBe("/")
  })

  it("counts no visit for a browser with the panel open, and keeps the affiliate all the same", async () => {
    const fetched = api()

    const response = await POST(request({ slug: "joao" }, { cookie: "bl_refresh=owner" }), shop())

    expect(response.status).toBe(200)
    expect(visits(fetched)).toEqual([])
    expect(response.cookies.get("bl_affiliate")).toBeDefined()
  })

  it.each([
    ["a link that credits nobody", { status: 200, body: { affiliate: null } }],
    ["nobody's link", { status: 404, body: { errorCode: "AFFILIATE_LINK_NOT_FOUND" } }],
    ["a shop off the air", { status: 403, body: { errorCode: "STORE_UNAVAILABLE" } }],
    ["an API that is away", { status: 503 }],
  ])("writes nothing and counts nothing for %s", async (_, link) => {
    const fetched = api(link)

    const response = await POST(request({ slug: "joao" }), shop())

    expect(response.status).toBe(204)
    expect(response.cookies.getAll()).toEqual([])
    expect(visits(fetched)).toEqual([])
  })

  it("keeps the affiliate even when the visit could not be counted", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (url) => (String(url).includes("/affiliate-link?") ? Response.json({ affiliate: JOAO }) : Promise.reject(new Error("away")))))

    expect((await POST(request({ slug: "joao" }), shop())).cookies.get("bl_affiliate")).toBeDefined()
  })

  it.each([
    ["another site", { origin: "https://evil.example" }, 403],
    ["no origin at all — not a page's fetch", { origin: null }, 403],
    ["a form, not JSON", { "content-type": "application/x-www-form-urlencoded" }, 415],
    ["a body longer than any link", { "content-length": "5000" }, 413],
  ])("drops a request from %s before the API hears of it", async (_what, headers, status) => {
    const fetched = api()

    expect((await POST(request({ slug: "joao" }, headers), shop())).status).toBe(status)
    expect(fetched).not.toHaveBeenCalled()
  })

  it.each([
    ["no name", {}],
    ["a name that is no text", { slug: 42 }],
    ["a blank name", { slug: "   " }],
    ["a name longer than any", { slug: "a".repeat(81) }],
  ])("refuses %s", async (_, body) => {
    const fetched = api()

    expect((await POST(request(body), shop())).status).toBe(400)
    expect(fetched).not.toHaveBeenCalled()
  })

  it("answers a shop's path that is no shop's as nothing", async () => {
    const fetched = api()

    expect((await POST(request({ slug: "joao" }, {}, "Não-É"), shop("Não-É"))).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })
})
