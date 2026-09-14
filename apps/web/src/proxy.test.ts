// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { proxy } from "./proxy"

const SESSION = {
  accessToken: "new-access",
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: "new-refresh",
  refreshTokenExpiresAt: new Date(Date.now() + 2_592_000_000).toISOString(),
  user: { id: "1", name: "Ana Souza", email: "ana@exemplo.com", emailVerified: true, createdAt: "" },
}

function request(pathname: string, cookie?: string): NextRequest {
  const headers = new Headers()
  if (cookie) headers.set("cookie", cookie)

  return new NextRequest(`http://localhost:3000${pathname}`, { headers })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("proxy", () => {
  it("sends a signed-out visitor to the sign-in screen", async () => {
    const response = await proxy(request("/dashboard"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost:3000/login")
  })

  it("leaves the signed-out screens alone", async () => {
    const response = await proxy(request("/login"))

    expect(response.headers.get("location")).toBeNull()
  })

  it("keeps a signed-in person away from the sign-in screen", async () => {
    const response = await proxy(request("/login", "hm_access=token"))

    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard")
  })

  it("refreshes an expired access token and lets the page render signed in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(SESSION, { status: 200 })))

    const response = await proxy(request("/dashboard", "hm_refresh=old-refresh"))

    // No redirect: the page renders on this same request.
    expect(response.headers.get("location")).toBeNull()
    expect(response.cookies.get("hm_access")?.value).toBe("new-access")
    expect(response.cookies.get("hm_refresh")?.value).toBe("new-refresh")
    // And the request carries the new token upstream, so Server Components see it too.
    expect(response.headers.get("x-middleware-override-headers")).toContain("cookie")
  })

  it("signs the browser out when the API refuses the refresh token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ statusCode: 401, errorCode: "AUTH_REFRESH_REUSED", message: "" }, { status: 401 }),
      ),
    )

    const response = await proxy(request("/dashboard", "hm_refresh=stolen"))

    expect(response.headers.get("location")).toBe("http://localhost:3000/login")
    expect(response.cookies.get("hm_access")?.value).toBe("")
    expect(response.cookies.get("hm_refresh")?.value).toBe("")
  })

  it("keeps the session when the API cannot be reached — an outage is not a sign-out", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connection refused") }))

    const response = await proxy(request("/dashboard", "hm_refresh=still-good"))

    expect(response.headers.get("location")).toBeNull()
    expect(response.cookies.getAll()).toEqual([])
  })

  it("sends a refreshed visitor off the sign-in screen", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(SESSION, { status: 200 })))

    const response = await proxy(request("/login", "hm_refresh=old-refresh"))

    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard")
    expect(response.cookies.get("hm_access")?.value).toBe("new-access")
  })
})
