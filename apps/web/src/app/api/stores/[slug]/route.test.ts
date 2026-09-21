// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET, PUT } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

const SLUG = "doces-da-ana"
const context = { params: Promise.resolve({ slug: SLUG }) }

function request(init: { body?: unknown; method?: string; cookie?: string } = {}): NextRequest {
  const headers = new Headers({
    "content-type": "application/json",
    origin: "http://localhost:3000",
    cookie: init.cookie ?? "bl_access=access-token",
  })

  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("GET /api/stores/[slug]", () => {
  it("reads one shop and invalidates nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ slug: SLUG }, { status: 200 })))

    const response = await GET(request(), context)

    expect(response.status).toBe(200)
    expect(revalidateStore).not.toHaveBeenCalled()
  })

  it("passes the API's ownership refusal through as it was written", async () => {
    const error = { statusCode: 403, errorCode: "STORE_FORBIDDEN", message: "Not yours" }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(error, { status: 403 })))

    const response = await GET(request(), context)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual(error)
  })
})

describe("PUT /api/stores/[slug]", () => {
  it("replaces the shop and drops what the storefront had cached for it", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ slug: SLUG }, { status: 200 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await PUT(request({ method: "PUT", body: { name: "Doces da Ana" } }), context)

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      `http://api.test/api/stores/${SLUG}`,
      expect.objectContaining({ method: "PUT" }),
    )
    expect(revalidateStore).toHaveBeenCalledWith(SLUG)
  })

  it("leaves the cached storefront alone when the API refused the change", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "STORE_NOT_FOUND" }, { status: 404 })))

    const response = await PUT(request({ method: "PUT", body: {} }), context)

    expect(response.status).toBe(404)
    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
