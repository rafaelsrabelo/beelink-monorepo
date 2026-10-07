// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { PUT } from "./route"

// next/cache refuses to run outside a request Next itself started, and what this asserts is that
// the handler asks for the invalidation — not what Next does with it.
const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

const context = { params: Promise.resolve({ slug: "lessari", categoryId: "c1" }) }

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/stores/lessari/product-categories/c1", {
    method: "PUT",
    headers: new Headers({ "content-type": "application/json", origin: "http://localhost:3000", cookie: "bl_access=access-token" }),
    body: JSON.stringify(body),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

/**
 * A category's banner is served with the catalogue, under `catalog:<slug>` (BEELINK-307): saving or
 * clearing one has to drop it, or the category's page keeps the old picture until the window closes.
 */
describe("PUT /api/stores/[slug]/product-categories/[categoryId]", () => {
  it.each([{ bannerUrl: "https://cdn.example/banner.png" }, { bannerUrl: null }])("forwards %j and drops what the shop window kept", async (body) => {
    const fetchSpy = vi.fn(async () => Response.json({ id: "c1", ...body }, { status: 200 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await PUT(request(body), context)

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/api/stores/lessari/product-categories/c1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(body) }),
    )
    expect(revalidateStore).toHaveBeenCalledExactlyOnceWith("lessari")
  })

  it("drops nothing when the API refused the write", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 400, errorCode: "VALIDATION_FAILED", message: "bannerUrl must be a URL address" }, { status: 400 })))

    const response = await PUT(request({ bannerUrl: "javascript:alert(1)" }), context)

    expect(response.status).toBe(400)
    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
