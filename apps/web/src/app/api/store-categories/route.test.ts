// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

function request(cookie = "bl_access=access-token"): NextRequest {
  return new NextRequest("http://localhost:3000/api/store-categories", {
    method: "GET",
    headers: new Headers({ "content-type": "application/json", origin: "http://localhost:3000", cookie }),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("GET /api/store-categories", () => {
  it("forwards the taxonomy the API seeds, signed in", async () => {
    const categories = [{ id: "1", slug: "moda", name: "Moda" }]
    const fetchSpy = vi.fn(async () => Response.json(categories, { status: 200 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(categories)
    expect(fetchSpy).toHaveBeenCalledWith("http://api.test/api/store-categories", expect.anything())
  })
})
