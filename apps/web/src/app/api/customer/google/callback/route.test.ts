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

const FLIGHT = `bl_oauth_google=${encodeURIComponent(new URLSearchParams({ state: "abc", slug: "loja", signIn: "/loja/entrar?modo=criar", back: "/loja/carrinho" }).toString())}`

function back(query: string, cookie: string | null = FLIGHT, host = "localhost:3000") {
  const headers = new Headers({ host })
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

  it("says the shopper cancelled when Google sends an error instead of a code, on the face they left", async () => {
    vi.stubGlobal("fetch", vi.fn())

    const location = new URL((await back("error=access_denied&state=abc")).headers.get("location") ?? "")

    expect(location.searchParams.get("erro")).toBe("GOOGLE_CANCELLED")
    // Where they were going survives the detour, and so does the face — signing up, here.
    expect(location.searchParams.get("voltar")).toBe("/loja/carrinho")
    expect(location.searchParams.get("modo")).toBe("criar")
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

  /** BEELINK-284: a flow begun at the shop's own domain ends there, and this host stores no session. */
  describe("with a handoff to the shop's own domain", () => {
    const CODE = "c".repeat(43)
    const handoff = (host: string) => vi.fn(async () => Response.json({ session: null, handoff: { host, code: CODE }, storeSlug: "loja", returnTo: "/loja/carrinho" }))

    it("sends the browser to the domain the API named, with the code, and stores no session here", async () => {
      vi.stubGlobal("fetch", handoff("loja.com.br"))

      const response = await back("code=o-codigo&state=abc", FLIGHT, "beelink.biz")

      expect(response.status).toBe(303)
      expect(response.headers.get("location")).toBe(`https://loja.com.br/loja/api/customer/google/session?code=${CODE}`)
      const cookies = response.headers.get("set-cookie") ?? ""
      expect(cookies).not.toContain("bl_shopper_access")
      expect(cookies).not.toContain("bl_shopper_refresh")
      expect(cookies).toMatch(/bl_oauth_google=;/)
      expect(response.headers.get("cache-control")).toBe("no-store")
      expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    })

    // Development and the e2e: nothing terminates TLS, and the port is the server's own.
    it("goes on by the request's scheme and port from a local host", async () => {
      vi.stubGlobal("fetch", handoff("lvh.me"))

      const response = await back("code=o-codigo&state=abc", FLIGHT, "localhost:3800")

      expect(response.headers.get("location")).toBe(`http://lvh.me:3800/loja/api/customer/google/session?code=${CODE}`)
    })

    // The one thing that may never happen here: a sign-in sent to a host a request chose.
    it("takes the host from the API alone: no parameter, header or cookie of the request moves it", async () => {
      vi.stubGlobal("fetch", handoff("loja.com.br"))
      const flight = `bl_oauth_google=${encodeURIComponent(new URLSearchParams({ state: "abc", slug: "loja", signIn: "https://evil.example/entrar", back: "https://evil.example/", host: "evil.example" }).toString())}`
      const headers = new Headers({ host: "beelink.biz", cookie: flight, referer: "https://evil.example/", origin: "https://evil.example" })

      const response = await GET(
        new NextRequest("http://localhost:3000/api/customer/google/callback?code=x&state=abc&host=evil.example&dominio=evil.example&voltar=https%3A%2F%2Fevil.example&redirect_uri=https%3A%2F%2Fevil.example", { headers }),
      )

      const location = new URL(response.headers.get("location") ?? "")
      expect(location.origin).toBe("https://loja.com.br")
      expect(location.pathname).toBe("/loja/api/customer/google/session")
      expect([...location.searchParams.keys()]).toEqual(["code"])
    })

    it("refuses a host or a shop that is not shaped like one, and carries the code nowhere", async () => {
      for (const [host, storeSlug] of [["evil.example/x", "loja"], ["a@evil.example", "loja"], ["loja.com.br:8080", "loja"], ["", "loja"], ["loja.com.br", "../x"]] as const) {
        vi.stubGlobal("fetch", vi.fn(async () => Response.json({ session: null, handoff: { host, code: CODE }, storeSlug, returnTo: null })))

        const response = await back("code=o-codigo&state=abc", FLIGHT, "beelink.biz")

        const location = response.headers.get("location") ?? ""
        expect(new URL(location).origin).toBe("http://beelink.biz")
        expect(location).not.toContain(CODE)
        // An empty host is no handoff at all, and then there is no session either.
        expect(new URL(location).searchParams.get("erro")).toBe("UNKNOWN")
      }
    })
  })
})
