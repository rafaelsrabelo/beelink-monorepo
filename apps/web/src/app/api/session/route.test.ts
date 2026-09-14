// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { DELETE, POST } from "./route"

const SESSION = {
  accessToken: "access-token",
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: "refresh-token",
  refreshTokenExpiresAt: new Date(Date.now() + 2_592_000_000).toISOString(),
  user: { id: "1", name: "Ana Souza", email: "ana@exemplo.com", emailVerified: true, createdAt: "" },
}

function request(init: { body?: unknown; origin?: string | null; method?: string; cookie?: string } = {}): NextRequest {
  const headers = new Headers({ "content-type": "application/json" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)

  return new NextRequest("http://localhost:3000/api/session", {
    method: init.method ?? "POST",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("POST /api/session", () => {
  it("keeps both tokens in httpOnly cookies and answers only the user", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(SESSION, { status: 200 })))

    const response = await POST(request({ body: { email: "ana@exemplo.com", password: "uma-senha-comprida" } }))
    const body: unknown = await response.json()
    const cookies = response.cookies.getAll()

    expect(response.status).toBe(200)
    expect(body).toEqual(SESSION.user)
    expect(JSON.stringify(body)).not.toContain("access-token")

    const access = cookies.find((cookie) => cookie.name === "hm_access")
    const refresh = cookies.find((cookie) => cookie.name === "hm_refresh")
    expect(access).toMatchObject({ value: "access-token", httpOnly: true, sameSite: "lax", path: "/" })
    expect(refresh).toMatchObject({ value: "refresh-token", httpOnly: true })
  })

  it("passes the API's refusal through untouched", async () => {
    const error = { statusCode: 401, errorCode: "AUTH_INVALID_CREDENTIALS", message: "Invalid e-mail or password" }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(error, { status: 401 })))

    const response = await POST(request({ body: { email: "ana@exemplo.com", password: "errada" } }))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual(error)
    expect(response.cookies.getAll()).toEqual([])
  })

  it("refuses a form posted from another site, before touching the API", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const response = await POST(request({ body: {}, origin: "http://evil.example" }))

    expect(response.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("forwards the caller's address, so the API's rate limit sees people and not this server", async () => {
    const fetchSpy = vi.fn(async () => Response.json(SESSION, { status: 200 }))
    vi.stubGlobal("fetch", fetchSpy)

    const withIp = request({ body: {} })
    withIp.headers.set("x-forwarded-for", "203.0.113.7")
    await POST(withIp)

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/api/auth/login",
      expect.objectContaining({ headers: expect.objectContaining({ "x-forwarded-for": "203.0.113.7" }) }),
    )
  })
})

describe("DELETE /api/session", () => {
  it("tells the API to revoke the session and clears both cookies", async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchSpy)

    const response = await DELETE(request({ method: "DELETE", cookie: "hm_refresh=refresh-token" }))

    expect(response.status).toBe(204)
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/api/auth/logout",
      expect.objectContaining({ body: JSON.stringify({ refreshToken: "refresh-token" }) }),
    )
    expect(response.cookies.get("hm_access")?.value).toBe("")
    expect(response.cookies.get("hm_refresh")?.value).toBe("")
  })

  it("still signs the browser out when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connection refused") }))

    const response = await DELETE(request({ method: "DELETE", cookie: "hm_refresh=refresh-token" }))

    expect(response.status).toBe(204)
    expect(response.cookies.get("hm_access")?.value).toBe("")
  })
})
