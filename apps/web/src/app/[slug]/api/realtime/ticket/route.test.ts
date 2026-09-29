// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

function post(cookie = "bl_shopper_access=shopper-access", origin: string | null = "http://localhost:3000") {
  const headers = new Headers({ "content-type": "application/json", cookie })
  if (origin) headers.set("origin", origin)
  return POST(new NextRequest("http://localhost:3000/loja/api/realtime/ticket", { method: "POST", headers, body: "{}" }), { params: Promise.resolve({ slug: "loja" }) })
}

afterEach(() => vi.unstubAllGlobals())

describe("the shopper's real-time ticket", () => {
  it("asks the API with the shopper's session, under the shop's path", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ ticket: "s".repeat(43), expiresAt: "2026-09-29T12:01:00.000Z" }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await post()

    expect(response.status).toBe(200)
    expect((await response.json()) as { ticket: string }).toMatchObject({ ticket: "s".repeat(43) })
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toContain("/stores/loja/customer/realtime/ticket")
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer shopper-access")
  })

  it("says a session that ended, and clears it, rather than hand a ticket", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 })))

    const response = await post("bl_shopper_access=old")

    expect(response.status).toBe(401)
    expect(response.headers.getSetCookie().some((cookie) => cookie.startsWith("bl_shopper_access=;") || cookie.includes("Max-Age=0"))).toBe(true)
  })

  it("refuses another site", async () => {
    vi.stubGlobal("fetch", vi.fn())
    expect((await post(undefined, "https://evil.example")).status).toBe(403)
  })
})
