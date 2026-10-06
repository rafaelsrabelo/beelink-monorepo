// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

const CATEGORY = "0199c000-0000-7000-8000-000000000001"

function request(query: string, origin = "http://localhost:3000", cookie = "bl_access=access-token"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/page-templates${query}`, {
    method: "GET",
    headers: new Headers({ "content-type": "application/json", origin, ...(cookie ? { cookie } : {}) }),
  })
}

function answer(status: number, body: unknown) {
  const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json(body, { status }))
  vi.stubGlobal("fetch", fetchSpy)
  return fetchSpy
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("/api/page-templates", () => {
  it("lists the models a new store of the type may open with, with the session, by its category", async () => {
    const spy = answer(200, [{ id: "ofertas", recommended: true, needs: [] }])

    const response = await GET(request(`?storeType=ECOMMERCE&categoryId=${CATEGORY}`))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{ id: "ofertas", recommended: true, needs: [] }])
    expect(spy.mock.calls[0]?.[0]).toBe(`http://api.test/api/page-templates?storeType=ECOMMERCE&categoryId=${CATEGORY}`)
    expect(spy.mock.calls[0]?.[1]?.method).toBe("GET")
    expect((spy.mock.calls[0]?.[1]?.headers as Record<string, string>).authorization).toBe("Bearer access-token")
  })

  // No category picked is an empty field: sent as `?categoryId=`, the API would refuse an id that is none.
  it("leaves an empty category out, and passes on nothing it was not asked to", async () => {
    const spy = answer(200, [])

    await GET(request("?storeType=ECOMMERCE&categoryId=&slug=loja&publish=true"))

    expect(spy.mock.calls[0]?.[0]).toBe("http://api.test/api/page-templates?storeType=ECOMMERCE")
  })

  it("hands back the API's refusal of a type that is none", async () => {
    answer(400, { statusCode: 400, errorCode: "PAGE_TEMPLATE_UNAVAILABLE", message: "No" })

    const response = await GET(request(""))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ errorCode: "PAGE_TEMPLATE_UNAVAILABLE" })
  })

  it("answers 401 with no session, without asking the API", async () => {
    const spy = answer(200, [])

    const response = await GET(request("?storeType=ECOMMERCE", "http://localhost:3000", ""))

    expect(response.status).toBe(401)
    expect(spy).not.toHaveBeenCalled()
  })

  it("refuses a request from another site", async () => {
    const spy = answer(200, [])

    const response = await GET(request("?storeType=ECOMMERCE", "https://evil.example"))

    expect(response.status).toBe(403)
    expect(spy).not.toHaveBeenCalled()
  })
})
