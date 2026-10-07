// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const shop = (slug = "lessari") => ({ params: Promise.resolve({ slug }) })

function request(body: unknown, headers: Record<string, string | null> = {}, slug = "lessari") {
  const all: Record<string, string | null> = { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": "203.0.113.9", ...headers }

  return new NextRequest(`http://localhost:3000/${slug}/api/funnel`, {
    method: "POST",
    headers: Object.fromEntries(Object.entries(all).filter((entry): entry is [string, string] => entry[1] !== null)),
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

function api(status = 204) {
  const fetched = vi.fn<Fetched>(async () => new Response(null, { status }))
  vi.stubGlobal("fetch", fetched)
  return fetched
}

afterEach(() => vi.unstubAllGlobals())

describe("a shop window counting a step of its funnel (BEELINK-276)", () => {
  it.each(["PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART", "CHECKOUT_START"])("tells the API the step %s at that shop, with the visitor's address for its limit", async (step) => {
    const fetched = api()

    const response = await POST(request({ step }), shop())

    expect([response.status, await response.text()]).toEqual([204, ""])
    expect(fetched).toHaveBeenCalledTimes(1)
    const [url, init] = fetched.mock.calls[0]!
    expect([String(url).replace(/^.*\/api/, ""), init?.method, init?.body]).toEqual(["/stores/lessari/funnel-events", "POST", JSON.stringify({ step })])
    expect(new Headers(init?.headers).get("x-forwarded-for")).toBe("203.0.113.9")
  })

  it("forwards the step's name and nothing else: no cookie, no token, no browser, nothing more the body said", async () => {
    const fetched = api()

    await POST(request({ step: "PAGE_VIEW", visitorId: "abc", page: "/lessari/produto/haze" }, { cookie: "bl_cart=abc; bl_shopper_access=shopper; bl_access=owner; _fbp=fb.1.2.3", "user-agent": "Mozilla/5.0 (visitor)", referer: "http://localhost:3000/lessari/produto/haze" }), shop())

    const [, init] = fetched.mock.calls[0]!
    expect(init?.body).toBe('{"step":"PAGE_VIEW"}')
    expect([...new Headers(init?.headers).keys()].sort()).toEqual(["content-type", "x-forwarded-for"])
  })

  it.each([
    ["another site", { origin: "https://evil.example" }, 403],
    ["no origin at all — not a page's fetch", { origin: null }, 403],
    ["a form, not JSON", { "content-type": "application/x-www-form-urlencoded" }, 415],
    ["a body longer than any step", { "content-length": "5000" }, 413],
  ])("drops a request from %s before the API hears of it", async (_what, headers, status) => {
    const fetched = api()

    const response = await POST(request({ step: "PAGE_VIEW" }, headers), shop())

    expect([response.status, await response.text()]).toEqual([status, ""])
    expect(fetched).not.toHaveBeenCalled()
  })

  it.each([
    ["a step it does not know", { step: "PURCHASE" }],
    ["a step in other words", { step: "page_view" }],
    ["no step", {}],
    ["a list", [{ step: "PAGE_VIEW" }]],
    ["what is no JSON", "step=PAGE_VIEW"],
    ["nothing", "null"],
  ])("drops %s without asking the API", async (_what, body) => {
    const fetched = api()

    expect((await POST(request(body), shop())).status).toBe(400)
    expect(fetched).not.toHaveBeenCalled()
  })

  it("asks nothing for a path that spells no shop", async () => {
    const fetched = api()

    expect((await POST(request({ step: "PAGE_VIEW" }, {}, "Loja..%2F"), shop("Loja../"))).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })

  it("answers the API's status with no body — a limit reached is a count lost, and nothing to show", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 429, errorCode: "RATE_LIMITED", message: "Too many requests" }, { status: 429 })))

    const response = await POST(request({ step: "PAGE_VIEW" }), shop())

    expect([response.status, await response.text()]).toEqual([429, ""])
  })

  it("answers 503, and throws nothing, with the API away", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Promise.reject(new TypeError("fetch failed"))))

    expect((await POST(request({ step: "PAGE_VIEW" }), shop())).status).toBe(503)
  })

  it("checks the origin the browser addressed, not the address the server binds", async () => {
    const fetched = api()
    const behindProxy = new NextRequest("http://0.0.0.0:3000/lessari/api/funnel", { method: "POST", headers: { "content-type": "application/json", origin: "http://beelink.biz", "x-forwarded-host": "beelink.biz" }, body: '{"step":"PAGE_VIEW"}' })

    expect((await POST(behindProxy, shop())).status).toBe(204)
    expect(fetched).toHaveBeenCalledTimes(1)
  })
})
