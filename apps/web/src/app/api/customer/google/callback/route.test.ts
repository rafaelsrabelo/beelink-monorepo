// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

const SESSION = {
  accessToken: "shopper-access",
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: "shopper-refresh",
  refreshTokenExpiresAt: new Date(Date.now() + 2_592_000_000).toISOString(),
  user: { id: "1", name: "Bia", email: "bia@exemplo.com", emailVerified: true, createdAt: "" },
}

const FLIGHT = `bl_oauth_google=${encodeURIComponent(new URLSearchParams({ state: "abc", slug: "loja", signIn: "/loja/entrar" }).toString())}`

function back(query: string, cookie: string | null = FLIGHT) {
  const headers = new Headers()
  if (cookie) headers.set("cookie", cookie)
  return GET(new NextRequest(`http://localhost:3000/api/customer/google/callback?${query}`, { headers }))
}

afterEach(() => vi.unstubAllGlobals())

describe("GET /api/customer/google/callback", () => {
  it("finishes the sign-in, keeps the session in the shopper's cookies and returns where they were", async () => {
    const fetched = vi.fn(async () => Response.json({ session: SESSION, storeSlug: "loja", returnTo: "/loja/carrinho" }))
    vi.stubGlobal("fetch", fetched)

    const response = await back("code=o-codigo&state=abc")

    expect(response.status).toBe(303)
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/loja/carrinho")
    const [url, init] = fetched.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe("http://api.test/api/customer/google/callback")
    expect(JSON.parse(String(init.body))).toEqual({ code: "o-codigo", state: "abc" })
    const cookies = response.headers.get("set-cookie") ?? ""
    // On the shop's path, like the password door's: the account is that shop's alone.
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "shopper-access", httpOnly: true, path: "/loja" })
    expect(response.cookies.get("bl_shopper_refresh")).toMatchObject({ value: "shopper-refresh", path: "/loja" })
    expect(cookies).toMatch(/bl_oauth_google=;/)
  })

  // The state that comes back must be the one this browser holds: otherwise someone else began it.
  it("refuses a state this browser did not start, without asking the API", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    const response = await back("code=o-codigo&state=outro")

    expect(fetched).not.toHaveBeenCalled()
    const location = new URL(response.headers.get("location") ?? "")
    expect(location.pathname).toBe("/loja/entrar")
    expect(location.searchParams.get("erro")).toBe("GOOGLE_STATE_INVALID")
    expect(response.headers.get("set-cookie") ?? "").not.toContain("bl_shopper_access=")
  })

  it("says the shopper cancelled when Google sends an error instead of a code", async () => {
    vi.stubGlobal("fetch", vi.fn())

    const location = new URL((await back("error=access_denied&state=abc")).headers.get("location") ?? "")

    expect(location.searchParams.get("erro")).toBe("GOOGLE_CANCELLED")
  })

  it("passes the API's refusal on to the sign-in page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 403, errorCode: "GOOGLE_EMAIL_UNVERIFIED", message: "" }, { status: 403 })))

    const location = new URL((await back("code=o-codigo&state=abc")).headers.get("location") ?? "")

    expect(location.searchParams.get("erro")).toBe("GOOGLE_EMAIL_UNVERIFIED")
  })

  it("goes to the front page when no flight is held, since the shop is unknown", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect(new URL((await back("code=x&state=abc", null)).headers.get("location") ?? "").pathname).toBe("/")
  })
})
