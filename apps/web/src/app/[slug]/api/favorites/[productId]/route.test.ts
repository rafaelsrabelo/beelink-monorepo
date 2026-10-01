// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { DELETE, PUT } from "./route"

const PRODUCT = "01a0d395-c1ab-7399-a472-000000000001"

function call(method: "PUT" | "DELETE", body?: unknown, productId = PRODUCT) {
  const headers = new Headers({ "content-type": "application/json", origin: "http://localhost:3000", cookie: "bl_shopper_access=shopper-access" })
  const request = new NextRequest(`http://localhost:3000/loja/api/favorites/${productId}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const context = { params: Promise.resolve({ slug: "loja", productId }) }
  return method === "PUT" ? PUT(request, context) : DELETE(request, context)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("liking and unliking a product", () => {
  it("likes it at the API with the combination chosen, and passes the 204 through", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    const response = await call("PUT", { variantId: "v-1", price: 1 })

    expect(response.status).toBe(204)
    expect(String(fetched.mock.calls[0]?.[0])).toContain(`/stores/loja/customer/favorites/${PRODUCT}`)
    const init = fetched.mock.calls[0]?.[1]
    expect(init?.method).toBe("PUT")
    // Only the combination is passed on.
    expect(JSON.parse(String(init?.body))).toEqual({ variantId: "v-1" })
  })

  it("likes the product as a whole when no combination is sent", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    expect((await call("PUT", {})).status).toBe(204)
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual({ variantId: null })
  })

  it("unlikes it with a DELETE, and passes on what the API refused", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)
    expect((await call("DELETE")).status).toBe(204)
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("DELETE")

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 409, errorCode: "CUSTOMER_FAVORITE_LIMIT", message: "x" }, { status: 409 })))
    const refused = await call("PUT", {})
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ errorCode: "CUSTOMER_FAVORITE_LIMIT" })
  })

  it("asks nothing for an id that is none, or a combination that is not an id", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await call("PUT", {}, "nao-e-um-id")).status).toBe(404)
    expect((await call("DELETE", undefined, "../orders")).status).toBe(404)
    expect((await call("PUT", { variantId: 7 })).status).toBe(400)
    expect(fetched).not.toHaveBeenCalled()
  })
})
