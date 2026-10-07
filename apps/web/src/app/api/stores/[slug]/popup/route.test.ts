// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET, PUT } from "./route"

const mocks = vi.hoisted(() => ({ revalidateOffers: vi.fn(), revalidateStore: vi.fn() }))
vi.mock("@/lib/revalidate", () => ({ revalidateOffers: mocks.revalidateOffers, revalidateStore: mocks.revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(init: { method?: string; body?: object; origin?: string; contentType?: string } = {}) {
  return new NextRequest("http://localhost:3000/api/stores/loja/popup", {
    method: init.method ?? "GET",
    headers: { "content-type": init.contentType ?? "application/json", origin: init.origin ?? "http://localhost:3000", cookie: "bl_access=owner-access" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const shop = { params: Promise.resolve({ slug: "loja" }) }
const form = { enabled: true, imageUrl: null, title: "Ganhe {beneficio}", text: null, buttonLabel: null, trigger: "ON_ARRIVAL", delaySeconds: 5, benefitSource: "AUTO", benefitId: null, keepReminder: true }

afterEach(() => {
  vi.unstubAllGlobals()
  mocks.revalidateOffers.mockReset()
  mocks.revalidateStore.mockReset()
})

describe("the shop's first-purchase pop-up, for the panel (BEELINK-306)", () => {
  it("reads it at the API as the owner, and drops nothing by reading", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ settings: {}, benefit: null, options: [] }))
    vi.stubGlobal("fetch", fetched)

    expect((await GET(request(), shop)).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/loja\/popup$/)
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("GET")
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
    expect(mocks.revalidateOffers).not.toHaveBeenCalled()
  })

  it("saves it with the body as it came, and drops the shop's kept offers — which is where a visitor is served it", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ settings: form, benefit: null, options: [] }))
    vi.stubGlobal("fetch", fetched)

    expect((await PUT(request({ method: "PUT", body: form }), shop)).status).toBe(200)
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("PUT")
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual(form)
    expect(mocks.revalidateOffers).toHaveBeenCalledOnce()
    expect(mocks.revalidateOffers).toHaveBeenCalledWith("loja")
    // The offers' own tag, and not the catalogue's: a pop-up is in no listing.
    expect(mocks.revalidateStore).not.toHaveBeenCalled()
  })

  it("hands the API's refusal on, and keeps the cache", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 400, errorCode: "POPUP_TEXT_PROMISES_NUMBER", message: "title states a discount by hand" }, { status: 400 })))

    const response = await PUT(request({ method: "PUT", body: { ...form, title: "Ganhe 10%" } }), shop)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ errorCode: "POPUP_TEXT_PROMISES_NUMBER" })
    expect(mocks.revalidateOffers).not.toHaveBeenCalled()
  })

  it("refuses a request from another site, and one that does not speak JSON, before asking the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await PUT(request({ method: "PUT", body: form, origin: "https://outro.site" }), shop)).status).toBe(403)
    expect((await GET(request({ origin: "https://outro.site" }), shop)).status).toBe(403)
    expect((await PUT(request({ method: "PUT", body: form, contentType: "text/plain" }), shop)).status).toBe(415)
    expect(fetched).not.toHaveBeenCalled()
    expect(mocks.revalidateOffers).not.toHaveBeenCalled()
  })
})
