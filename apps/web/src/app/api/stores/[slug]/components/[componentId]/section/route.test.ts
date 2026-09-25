// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { PUT } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

const SLUG = "doces-da-ana"
const COMPONENT = "0199c000-0000-7000-8000-000000000001"
const context = { params: Promise.resolve({ slug: SLUG, componentId: COMPONENT }) }

function request(body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/components/${COMPONENT}/section`, {
    method: "PUT",
    headers: new Headers({
      "content-type": "application/json",
      origin: "http://localhost:3000",
      cookie: "bl_access=access-token",
    }),
    body: JSON.stringify(body),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("PUT /api/stores/[slug]/components/[componentId]/section", () => {
  it("moves the component and drops what the storefront had cached for the shop", async () => {
    const fetchSpy = vi.fn(async () => Response.json([], { status: 200 }))
    vi.stubGlobal("fetch", fetchSpy)
    const body = { sectionId: "0199b000-0000-7000-8000-000000000001", position: 1, span: "HALF" }

    const response = await PUT(request(body), context)

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      `http://api.test/api/stores/${SLUG}/components/${COMPONENT}/section`,
      expect.objectContaining({ method: "PUT", body: JSON.stringify(body) }),
    )
    expect(revalidateStore).toHaveBeenCalledWith(SLUG)
  })

  it("passes a refused move through as it was written, and leaves the cache alone", async () => {
    const error = { statusCode: 409, errorCode: "COMPONENT_NOT_MOVABLE", message: "No" }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(error, { status: 409 })))

    const response = await PUT(request({ sectionId: "0199b000-0000-7000-8000-000000000001" }), context)

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual(error)
    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
