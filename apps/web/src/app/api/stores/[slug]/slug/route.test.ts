// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { PUT } from "./route"

// next/cache refuses to run outside a request Next itself started: what is asserted is that the handler asks.
const revalidate = vi.hoisted(() => ({ store: vi.fn(), offers: vi.fn() }))
vi.mock("@/lib/revalidate", () => ({ revalidateStore: revalidate.store, revalidateOffers: revalidate.offers }))

function request(body: unknown, init: { origin?: string } = {}): NextRequest {
  const headers = new Headers({ "content-type": "application/json", cookie: "bl_access=access-token", origin: init.origin ?? "http://localhost:3000" })
  return new NextRequest("http://localhost:3000/api/stores/padaria-do-bairo/slug", { method: "PUT", headers, body: JSON.stringify(body) })
}

const context = { params: Promise.resolve({ slug: "padaria-do-bairo" }) }

afterEach(() => {
  vi.unstubAllGlobals()
  revalidate.store.mockClear()
  revalidate.offers.mockClear()
})

describe("PUT /api/stores/[slug]/slug (BEELINK-331)", () => {
  it("hands the new address to the API with the token, and drops the shop windows of both addresses", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ id: "1", slug: "padaria-do-bairro" }, { status: 200 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await PUT(request({ slug: "Padaria do Bairro" }), context)

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/api/stores/padaria-do-bairo/slug",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ slug: "Padaria do Bairro" }), headers: expect.objectContaining({ authorization: "Bearer access-token" }) }),
    )
    expect(revalidate.store.mock.calls.map(([address]) => address)).toEqual(["padaria-do-bairo", "padaria-do-bairro"])
    expect(revalidate.offers.mock.calls.map(([address]) => address)).toEqual(["padaria-do-bairo", "padaria-do-bairro"])
  })

  it("passes a refusal on as it came, its details included, and drops nothing", async () => {
    const refusal = { statusCode: 409, errorCode: "STORE_SLUG_CHANGE_TOO_SOON", message: "…", details: { changeableOn: "2026-11-16" } }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(refusal, { status: 409 })))

    const response = await PUT(request({ slug: "padaria-nova" }), context)

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual(refusal)
    expect(revalidate.store).not.toHaveBeenCalled()
  })

  it("refuses a request from another site before touching the API", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const response = await PUT(request({ slug: "x" }, { origin: "http://evil.example" }), context)

    expect(response.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
