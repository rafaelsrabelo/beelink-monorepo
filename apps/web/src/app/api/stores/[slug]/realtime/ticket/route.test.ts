// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const context = { params: Promise.resolve({ slug: "loja" }) }

function request(origin = "http://localhost:3000", cookie = "bl_access=owner-token"): NextRequest {
  return new NextRequest("http://localhost:3000/api/stores/loja/realtime/ticket", {
    method: "POST",
    body: "{}",
    headers: new Headers({ "content-type": "application/json", origin, cookie }),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe("the panel's real-time ticket", () => {
  it("asks the API with the owner's session, and hands the page only the ticket", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ ticket: "t".repeat(43), expiresAt: "2026-09-29T12:01:00.000Z" }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(request(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ticket: "t".repeat(43), expiresAt: "2026-09-29T12:01:00.000Z" })
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe("http://api.test/api/stores/loja/realtime/ticket")
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer owner-token")
  })

  it("refuses another site, and a page with no session", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await POST(request("https://evil.example"), context)).status).toBe(403)
    expect((await POST(request(undefined, ""), context)).status).toBe(401)
  })
})
