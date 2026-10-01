// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { config, proxy } from "./proxy"

const SESSION = {
  accessToken: "new-access",
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: "new-refresh",
  refreshTokenExpiresAt: new Date(Date.now() + 2_592_000_000).toISOString(),
  user: { id: "1", name: "Ana Souza", email: "ana@exemplo.com", emailVerified: true, createdAt: "" },
}

/** An access token as the API signs one, as far as the proxy reads it: its expiry, `seconds` from now. */
function tokenFor(seconds: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString("base64url")
  return `h.${payload}.s`
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
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?voltar=%2Fdashboard")
  })

  it("leaves the signed-out screens alone", async () => {
    const response = await proxy(request("/login"))

    expect(response.headers.get("location")).toBeNull()
  })

  /**
   * `/admin` and not `/dashboard`: there is no account-wide screen any more. A shopkeeper is always
   * inside one shop, and `/admin` is the doorway that picks which — walking straight through when
   * there is only one shop or one they were last in.
   */
  it("keeps a signed-in person away from the sign-in screen", async () => {
    const response = await proxy(request("/login", "bl_access=token"))

    expect(response.headers.get("location")).toBe("http://localhost:3000/admin")
  })

  it("refreshes an expired access token and lets the page render signed in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(SESSION, { status: 200 })))

    const response = await proxy(request("/dashboard", "bl_refresh=old-refresh"))

    // No redirect: the page renders on this same request.
    expect(response.headers.get("location")).toBeNull()
    expect(response.cookies.get("bl_access")?.value).toBe("new-access")
    expect(response.cookies.get("bl_refresh")?.value).toBe("new-refresh")
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

    const response = await proxy(request("/dashboard", "bl_refresh=stolen"))

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?voltar=%2Fdashboard")
    expect(response.cookies.get("bl_access")?.value).toBe("")
    expect(response.cookies.get("bl_refresh")?.value).toBe("")
  })

  it("keeps the session when the API cannot be reached — an outage is not a sign-out", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connection refused") }))

    const response = await proxy(request("/dashboard", "bl_refresh=still-good"))

    expect(response.headers.get("location")).toBeNull()
    expect(response.cookies.getAll()).toEqual([])
  })

  it("sends a refreshed visitor off the sign-in screen", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(SESSION, { status: 200 })))

    const response = await proxy(request("/login", "bl_refresh=old-refresh"))

    expect(response.headers.get("location")).toBe("http://localhost:3000/admin")
    expect(response.cookies.get("bl_access")?.value).toBe("new-access")
  })

})

/**
 * Next reads the matcher itself; this is a faithful-enough reading of the two forms the list uses —
 * a literal path, and a `/:path*` tail — so the suite can ask what the matcher selects. An entry in
 * any other shape, such as the template's `/((?!api|…).*)`, falls through as the regex it already is
 * and is caught for what it selects.
 */
function selects(pathname: string, cookies: readonly string[] = []): boolean {
  return config.matcher.some((entry) => {
    if (typeof entry === "string") return new RegExp(`^${entry.replace("/:path*", "(?:/.*)?")}$`).test(pathname)

    const cookiesMatch = (entry.has ?? []).every((rule) => cookies.includes(rule.key)) && (entry.missing ?? []).every((rule) => !cookies.includes(rule.key))

    // The panel's handlers: under /api, save the groups that write their own cookies or a shop's.
    if (entry.source.startsWith("/api/")) return /^\/api\/(?!(?:session|auth|customer|storefront)(?:\/|$))[^/]+(?:\/.*)?$/.test(pathname) && cookiesMatch

    // The shop window's entry: a first segment that is neither Next's nor the API's.
    const segment = pathname.split("/")[1] ?? ""
    const shaped = /^[^/.]+$/.test(segment) && !/^(_next|api)/.test(segment)
    return shaped && cookiesMatch
  })
}

describe("the panel's route handlers, a quarter of an hour into an open tab (BEELINK-169)", () => {
  it("renews the pair on the way, for the handler and for the browser, and never redirects", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(SESSION, { status: 200 })))

    const response = await proxy(request("/api/stores/loja/orders", "bl_refresh=old-refresh"))

    expect(response.headers.get("location")).toBeNull()
    expect(response.cookies.get("bl_access")?.value).toBe("new-access")
    expect(response.cookies.get("bl_refresh")?.value).toBe("new-refresh")
    // The handler of this same request reads the new token.
    expect(response.headers.get("x-middleware-request-cookie")).toContain("bl_access=new-access")
  })

  it("clears a refused session and lets the handler answer 401, rather than redirect a JSON call", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 401 }, { status: 401 })))

    const response = await proxy(request("/api/stores/loja/orders", "bl_refresh=spent"))

    expect(response.headers.get("location")).toBeNull()
    expect(response.cookies.get("bl_refresh")?.value).toBe("")
  })

  it("renews ahead, a token with under three minutes left, and leaves a fresh one alone", async () => {
    const fetched = vi.fn(async () => Response.json(SESSION, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    await proxy(request("/api/stores/loja/orders", `bl_refresh=r; bl_access=${tokenFor(600)}`))
    expect(fetched).not.toHaveBeenCalled()

    const ahead = await proxy(request("/api/stores/loja/orders", `bl_refresh=r; bl_access=${tokenFor(90)}`))
    expect(ahead.cookies.get("bl_access")?.value).toBe("new-access")

    // An upload answers late: it never renews ahead.
    fetched.mockClear()
    await proxy(request("/api/uploads", `bl_refresh=r; bl_access=${tokenFor(90)}`))
    expect(fetched).not.toHaveBeenCalled()
  })

  it("answers an outage as one, never as a sign-out", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })))

    const response = await proxy(request("/api/stores/loja/orders", "bl_refresh=r"))

    expect(response.status).toBe(503)
    expect(response.cookies.get("bl_refresh")).toBeUndefined()
  })

  it("is handed only the panel's handlers, and only with a panel session", () => {
    expect(selects("/api/stores/loja/orders", ["bl_refresh"])).toBe(true)
    expect(selects("/api/uploads", ["bl_refresh"])).toBe(true)
    expect(selects("/api/stores/loja/orders", ["bl_refresh", "bl_access"])).toBe(true)
    expect(selects("/api/stores/loja/orders")).toBe(false)
    for (const own of ["/api/session", "/api/session/expired", "/api/auth/login", "/api/customer/google/callback", "/api/storefront/loja/search"]) {
      expect(selects(own, ["bl_refresh"])).toBe(false)
    }
  })
})

describe("the way back after signing in", () => {
  it("sends a signed-out visitor to sign in and back to the page they were on", async () => {
    const response = await proxy(request("/admin/loja/orders?status=RECEIVED"))
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?voltar=%2Fadmin%2Floja%2Forders%3Fstatus%3DRECEIVED")
  })

  it("sends a signed-in visitor of the sign-in screen back there, and never to another site", async () => {
    expect((await proxy(request("/login?voltar=%2Fadmin%2Floja%2Forders", "bl_access=token"))).headers.get("location")).toBe("http://localhost:3000/admin/loja/orders")
    expect((await proxy(request("/login?voltar=https%3A%2F%2Fevil.example", "bl_access=token"))).headers.get("location")).toBe("http://localhost:3000/admin")
  })
})

describe("a shopper on a shop's pages", () => {
  it("renews an expired session in place, and never redirects", async () => {
    const fetched = vi.fn(async () => Response.json(SESSION, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await proxy(request("/minha-loja/produtos", "bl_shopper_refresh=old"))

    expect(response.headers.get("location")).toBeNull()
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "new-access", path: "/minha-loja" })
    expect(String((fetched.mock.calls[0] as unknown[] | undefined)?.[0])).toContain("/stores/minha-loja/customer/refresh")
  })

  it("lets a refused shopper browse on, signed out", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "AUTH_TOKEN_INVALID" }, { status: 401 })))

    const response = await proxy(request("/minha-loja", "bl_shopper_refresh=old"))

    expect(response.headers.get("location")).toBeNull()
    expect(response.cookies.get("bl_shopper_refresh")).toMatchObject({ value: "", path: "/minha-loja" })
  })

  it("opens a shopper's e-mailed link even with a panel session in the same browser", async () => {
    for (const path of ["/verify-email?token=t&voltar=%2Fminha-loja", "/reset-password?token=t&voltar=%2Fminha-loja"]) {
      expect((await proxy(request(path, "bl_access=owner"))).headers.get("location")).toBeNull()
    }
    // A shopkeeper's own link, with no shop to return to, is still the panel's.
    expect((await proxy(request("/reset-password?token=t", "bl_access=owner"))).headers.get("location")).toBe("http://localhost:3000/admin")
  })

  it("leaves a shop page alone with no shopper's session, the panel's cookies notwithstanding", async () => {
    const response = await proxy(request("/minha-loja", "bl_refresh=owner"))

    expect(response.headers.get("location")).toBeNull()
    expect(response.cookies.get("bl_access")).toBeUndefined()
  })
})

describe("the proxy matcher", () => {
  /**
   * The guard on the storefront. `proxy()` redirects anything without a session cookie, so what
   * keeps `/<slug>` anonymous and indexable is that the matcher never hands it over — the assertion
   * below shows both halves. Restoring the template's inverse matcher answers every crawler with a
   * 302 for the whole public site, and nothing else in the suite would notice.
   */
  it("never selects a storefront path, which is the only reason one stays public", async () => {
    expect(selects("/minha-loja")).toBe(false)
    expect(selects("/minha-loja/produto-1")).toBe(false)
    // Nor for a shopper whose session is alive, or one who has none: only an expired one is kept up.
    expect(selects("/minha-loja", ["bl_shopper_refresh", "bl_shopper_access"])).toBe(false)
    expect(selects("/minha-loja", ["bl_access", "bl_refresh"])).toBe(false)
    expect(selects("/minha-loja/produtos", ["bl_shopper_refresh"])).toBe(true)
    // The handlers that read a shopper's session live on the shop's path, so they are kept up too.
    expect(selects("/minha-loja/api/customer/perfil", ["bl_shopper_refresh"])).toBe(true)

    // And were it handed over anyway, the proxy lets a shop path through: it never sends one to /login.
    const response = await proxy(request("/minha-loja"))
    expect(response.headers.get("location")).toBeNull()
  })

  /**
   * The landing page (BEELINK-256). Handed to the proxy, a visitor with no session would be sent to
   * /login — the root answering with the sign-in is the very thing the landing replaced.
   */
  it("never selects the root, whoever asks: the landing page is everyone's", () => {
    expect(selects("/")).toBe(false)
    expect(selects("/", ["bl_access", "bl_refresh"])).toBe(false)
    expect(selects("/", ["bl_refresh"])).toBe(false)
    expect(selects("/", ["bl_shopper_refresh"])).toBe(false)
  })

  it("still selects everything that needs a session, and the screens that end one", () => {
    expect(selects("/dashboard")).toBe(true)
    expect(selects("/dashboard/settings")).toBe(true)
    expect(selects("/admin")).toBe(true)
    expect(selects("/admin/minha-loja/produtos")).toBe(true)
    expect(selects("/login")).toBe(true)
    expect(selects("/reset-password")).toBe(true)
  })
})
