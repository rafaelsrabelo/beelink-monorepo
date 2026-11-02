// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { PUT } from "./route"

// next/cache refuses to run outside a request Next itself started, and what this asserts is that
// the handler asks for the invalidation — not what Next does with it.
const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

const context = { params: Promise.resolve({ slug: "lessari" }) }

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/stores/lessari/products/reorder", {
    method: "PUT",
    headers: new Headers({ "content-type": "application/json", origin: "http://localhost:3000", cookie: "bl_access=access" }),
    body: JSON.stringify(body),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

/** The shop window is served from a cache: a saved order that left it there would not be seen until the window closed. */
describe("PUT /api/stores/[slug]/products/reorder", () => {
  it("forwards the whole list and drops what the shop window kept", async () => {
    const fetchSpy = vi.fn(async () => Response.json([], { status: 200 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await PUT(request({ ids: ["b", "a"] }), context)

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/api/stores/lessari/products/reorder",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ ids: ["b", "a"] }) }),
    )
    expect(revalidateStore).toHaveBeenCalledExactlyOnceWith("lessari")
  })

  it("drops nothing when the API refused the list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 409, errorCode: "CATALOG_REORDER_MISMATCH", message: "No" }, { status: 409 })))

    const response = await PUT(request({ ids: ["a"] }), context)

    expect(response.status).toBe(409)
    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
