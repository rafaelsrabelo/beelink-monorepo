// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

const SLUG = "doces-da-ana"
const ID = "0199c000-0000-7000-8000-000000000001"
const context = { params: Promise.resolve({ slug: SLUG, componentId: ID }) }

function request(origin = "http://localhost:3000"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/components/${ID}/duplicate`, {
    method: "POST",
    headers: new Headers({ "content-type": "application/json", origin, cookie: "bl_access=access-token" }),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("POST /api/stores/[slug]/components/[componentId]/duplicate", () => {
  it("asks for the copy, and leaves the storefront's cache alone: a draft is served to nobody", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ id: "copy" }, { status: 201 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(request(), context)

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ id: "copy" })
    expect(fetchSpy).toHaveBeenCalledWith(
      `http://api.test/api/stores/${SLUG}/components/${ID}/duplicate`,
      expect.objectContaining({ method: "POST" }),
    )
    expect(revalidateStore).not.toHaveBeenCalled()
  })

  it("passes a refusal through as it was written, and leaves the cache alone", async () => {
    const error = { statusCode: 409, errorCode: "COMPONENT_KIND_SINGLETON", message: "No" }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(error, { status: 409 })))

    const response = await POST(request(), context)

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual(error)
    expect(revalidateStore).not.toHaveBeenCalled()
  })

  it("refuses a request from another site before it reaches the API", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(request("https://evil.example"), context)

    expect(response.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
