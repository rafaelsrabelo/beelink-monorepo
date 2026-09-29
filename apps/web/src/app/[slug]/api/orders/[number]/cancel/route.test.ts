// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

function post(number: string, init: { origin?: string | null; cookie?: string; contentType?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": init.contentType ?? "application/json" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)

  const request = new NextRequest(`http://localhost:3000/${slug}/api/orders/${number}/cancel`, { method: "POST", headers, body: "{}" })
  return POST(request, { params: Promise.resolve({ slug, number }) })
}

const urlOf = (call: unknown[] | undefined) => String(call?.[0])
const authOf = (call: unknown[] | undefined) => new Headers((call?.[1] as RequestInit | undefined)?.headers).get("authorization")

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shopper's cancel", () => {
  it("cancels at the API as the shopper, and answers the order as it is now", async () => {
    const fetched = vi.fn(async () => Response.json({ number: 12, status: "CANCELLED", cancelledBy: "CUSTOMER" }, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post("12", { cookie: "bl_shopper_access=shopper-access" })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: "CANCELLED" })
    expect(urlOf(fetched.mock.calls[0])).toContain("/stores/loja/customer/orders/12/cancel")
    expect(authOf(fetched.mock.calls[0])).toBe("Bearer shopper-access")
  })

  it("passes a refusal through as it came", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 409, errorCode: "ORDER_NOT_CANCELLABLE", message: "x" }, { status: 409 })))

    const response = await post("12", { cookie: "bl_shopper_access=shopper-access" })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ errorCode: "ORDER_NOT_CANCELLABLE" })
  })

  it("answers signed out, cookies cleared, when no session is left", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 })))

    const response = await post("12", { cookie: "bl_shopper_access=old" })

    expect(response.status).toBe(401)
    expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
  })

  it("refuses another site, a plain form, a slug that is none and a number that is none, before calling anything", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await post("12", { origin: "https://outro.site" })).status).toBe(403)
    expect((await post("12", { contentType: "application/x-www-form-urlencoded" })).status).toBe(415)
    expect((await post("12", {}, "../stores")).status).toBe(404)
    expect((await post("abc", {})).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })
})
