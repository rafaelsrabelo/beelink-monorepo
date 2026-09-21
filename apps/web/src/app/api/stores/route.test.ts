// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET, POST } from "./route"

// next/cache refuses to run outside a request Next itself started, and what this asserts is that
// the handler asks for the invalidation — not what Next does with it.
const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

const STORE = { id: "1", slug: "doces-da-ana", name: "Doces da Ana" }

function request(init: { body?: unknown; method?: string; cookie?: string; origin?: string | null } = {}): NextRequest {
  const headers = new Headers({ "content-type": "application/json" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  headers.set("cookie", init.cookie ?? "bl_access=access-token")

  return new NextRequest("http://localhost:3000/api/stores", {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("GET /api/stores", () => {
  it("asks the API for this person's own shops, carrying the token the browser cannot read", async () => {
    const fetchSpy = vi.fn(async () => Response.json([STORE], { status: 200 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([STORE])
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/api/stores/mine",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ authorization: "Bearer access-token" }),
      }),
    )
  })

  it("forwards the caller's address, so the API's rate limit sees people and not this server", async () => {
    const fetchSpy = vi.fn(async () => Response.json([], { status: 200 }))
    vi.stubGlobal("fetch", fetchSpy)

    const withIp = request()
    withIp.headers.set("x-forwarded-for", "203.0.113.7")
    await GET(withIp)

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/api/stores/mine",
      expect.objectContaining({ headers: expect.objectContaining({ "x-forwarded-for": "203.0.113.7" }) }),
    )
  })

  it("answers 401 without spending a round trip when no session cookie arrived", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const response = await GET(request({ cookie: "bl_locale=pt-BR" }))

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ errorCode: "AUTH_UNAUTHENTICATED" })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("refuses a request from another site before touching the API", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const response = await GET(request({ origin: "http://evil.example" }))

    expect(response.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe("POST /api/stores", () => {
  it("drops what the storefront cached for the slug the API stored, not the one that was posted", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(STORE, { status: 201 })))

    const response = await POST(request({ method: "POST", body: { name: "Doces da Ana", slug: "Doces Da Ana" } }))

    expect(response.status).toBe(201)
    expect(revalidateStore).toHaveBeenCalledWith("doces-da-ana")
  })

  it("passes the API's refusal through untouched and invalidates nothing", async () => {
    const error = { statusCode: 409, errorCode: "STORE_SLUG_TAKEN", message: "Taken" }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(error, { status: 409 })))

    const response = await POST(request({ method: "POST", body: {} }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual(error)
    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
