// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { PATCH } from "./[reviewId]/route"
import { GET } from "./route"
import { POST as seen } from "./seen/route"
import { GET as unseen } from "./unseen/route"

const mocks = vi.hoisted(() => ({ revalidateStore: vi.fn() }))
vi.mock("@/lib/revalidate", () => ({ revalidateStore: mocks.revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(path: string, init: { method?: string; body?: object; origin?: string } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", cookie: "bl_access=owner-access" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  mocks.revalidateStore.mockReset()
})

describe("the shop's reviews, for the panel", () => {
  it("pages them at the API as the owner, the query as it came, and counts the new ones", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ reviews: [], total: 0, page: 1, pageSize: 20, counts: { ALL: 0, PUBLISHED: 0, HIDDEN: 0 } }))
    vi.stubGlobal("fetch", fetched)

    expect((await GET(request("/api/stores/loja/reviews?status=HIDDEN&rating=1"), { params: Promise.resolve({ slug: "loja" }) })).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/reviews?status=HIDDEN&rating=1")
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")

    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ count: 3 })))
    expect(await (await unseen(request("/api/stores/loja/reviews/unseen"), { params: Promise.resolve({ slug: "loja" }) })).json()).toEqual({ count: 3 })
  })

  it("marks the list seen, passing the 204 through", async () => {
    const fetched = vi.fn<Fetched>(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    const response = await seen(request("/api/stores/loja/reviews/seen", { method: "POST", body: {} }), { params: Promise.resolve({ slug: "loja" }) })
    expect(response.status).toBe(204)
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("POST")
  })

  it("hides one and drops the shop window's cache, which a refusal leaves alone", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ id: "r1", hidden: true }))
    vi.stubGlobal("fetch", fetched)

    const response = await PATCH(request("/api/stores/loja/reviews/r1", { method: "PATCH", body: { hidden: true } }), { params: Promise.resolve({ slug: "loja", reviewId: "r1" }) })
    expect(response.status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/reviews/r1")
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual({ hidden: true })
    expect(mocks.revalidateStore).toHaveBeenCalledWith("loja")

    mocks.revalidateStore.mockReset()
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ errorCode: "REVIEW_NOT_FOUND" }, { status: 404 })))
    expect((await PATCH(request("/api/stores/loja/reviews/r9", { method: "PATCH", body: { hidden: true } }), { params: Promise.resolve({ slug: "loja", reviewId: "r9" }) })).status).toBe(404)
    expect(mocks.revalidateStore).not.toHaveBeenCalled()
  })

  it("refuses a request from another site, and asks nothing", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)
    expect((await GET(request("/api/stores/loja/reviews", { origin: "https://outro.site" }), { params: Promise.resolve({ slug: "loja" }) })).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})
