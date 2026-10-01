// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { PATCH as switchCoupon, PUT as replaceCoupon } from "../coupons/[couponId]/route"
import { GET as redemptions } from "../coupons/[couponId]/redemptions/route"
import { GET as coupons, POST as createCoupon } from "../coupons/route"
import { PATCH, PUT } from "./[promotionId]/route"
import { GET, POST } from "./route"

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

const shop = { params: Promise.resolve({ slug: "loja" }) }
const promotion = { params: Promise.resolve({ slug: "loja", promotionId: "p1" }) }
const coupon = { params: Promise.resolve({ slug: "loja", couponId: "c1" }) }

afterEach(() => {
  vi.unstubAllGlobals()
  mocks.revalidateStore.mockReset()
})

describe("the shop's promotions, for the panel", () => {
  it("pages them at the API as the owner, the query as it came", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ promotions: [], total: 0, page: 1, pageSize: 20, counts: {} }))
    vi.stubGlobal("fetch", fetched)

    expect((await GET(request("/api/stores/loja/promotions?status=ACTIVE&page=2"), shop)).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/promotions?status=ACTIVE&page=2")
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
    // Reading drops nothing.
    expect(mocks.revalidateStore).not.toHaveBeenCalled()
  })

  it("creates, replaces and pauses one, dropping the shop window's cache each time", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ id: "p1" }, { status: 201 }))
    vi.stubGlobal("fetch", fetched)
    const body = { name: "Semana", scope: "CART" }

    expect((await POST(request("/api/stores/loja/promotions", { method: "POST", body }), shop)).status).toBe(201)
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("POST")
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual(body)

    await PUT(request("/api/stores/loja/promotions/p1", { method: "PUT", body }), promotion)
    expect(String(fetched.mock.calls[1]?.[0])).toContain("/stores/loja/promotions/p1")
    expect(fetched.mock.calls[1]?.[1]?.method).toBe("PUT")

    await PATCH(request("/api/stores/loja/promotions/p1", { method: "PATCH", body: { active: false } }), promotion)
    expect(JSON.parse(String(fetched.mock.calls[2]?.[1]?.body))).toEqual({ active: false })
    expect(mocks.revalidateStore.mock.calls).toEqual([["loja"], ["loja"], ["loja"]])
  })

  it("leaves the cache alone on a refusal, and passes the refusal through", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ errorCode: "PROMOTION_TARGET_NOT_FOUND" }, { status: 404 })))

    const response = await POST(request("/api/stores/loja/promotions", { method: "POST", body: {} }), shop)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ errorCode: "PROMOTION_TARGET_NOT_FOUND" })
    expect(mocks.revalidateStore).not.toHaveBeenCalled()
  })

  it("refuses a request from another site, and asks nothing", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)
    expect((await GET(request("/api/stores/loja/promotions", { origin: "https://outro.site" }), shop)).status).toBe(403)
    expect((await PATCH(request("/api/stores/loja/promotions/p1", { method: "PATCH", body: { active: false }, origin: "https://outro.site" }), promotion)).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})

describe("the shop's coupons, for the panel", () => {
  it("pages them, creates, replaces and pauses one, and reads its uses — never touching the shop window's cache", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ id: "c1" }))
    vi.stubGlobal("fetch", fetched)

    await coupons(request("/api/stores/loja/coupons?status=EXHAUSTED"), shop)
    await createCoupon(request("/api/stores/loja/coupons", { method: "POST", body: { code: "BEMVINDO10" } }), shop)
    await replaceCoupon(request("/api/stores/loja/coupons/c1", { method: "PUT", body: { code: "VOLTEI15" } }), coupon)
    await switchCoupon(request("/api/stores/loja/coupons/c1", { method: "PATCH", body: { active: false } }), coupon)
    await redemptions(request("/api/stores/loja/coupons/c1/redemptions?page=2"), coupon)

    expect(fetched.mock.calls.map((call) => [call[1]?.method, String(call[0]).replace(/^.*\/stores/, "/stores")])).toEqual([
      ["GET", "/stores/loja/coupons?status=EXHAUSTED"],
      ["POST", "/stores/loja/coupons"],
      ["PUT", "/stores/loja/coupons/c1"],
      ["PATCH", "/stores/loja/coupons/c1"],
      ["GET", "/stores/loja/coupons/c1/redemptions?page=2"],
    ])
    expect(JSON.parse(String(fetched.mock.calls[2]?.[1]?.body))).toEqual({ code: "VOLTEI15" })
    expect(mocks.revalidateStore).not.toHaveBeenCalled()
  })

  it("refuses a request from another site", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)
    expect((await redemptions(request("/api/stores/loja/coupons/c1/redemptions", { origin: "https://outro.site" }), coupon)).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})
