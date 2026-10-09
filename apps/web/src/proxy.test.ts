// Libs
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * Which host is which shop's, as the proxy is told: no shop has a domain unless a test gives it
 * one. The copy of the API's table has its own suite (`lib/shop-hosts.test.ts`); stood in for here,
 * the proxy's first call to the API in every test below is the one that test is about.
 */
const table = vi.hoisted(() => ({ domains: {} as Record<string, string>, asked: 0 }))
vi.mock("@/lib/shop-hosts", async (original) => ({
  ...(await original<typeof import("@/lib/shop-hosts")>()),
  shopHosts: async () => {
    table.asked += 1
    return {
      slugOf: (host: string) => table.domains[host] ?? null,
      hostOf: (slug: string) => Object.keys(table.domains).find((host) => table.domains[host] === slug) ?? null,
    }
  },
}))

// App
import { config, proxy } from "./proxy"
import { wasHandedOver } from "@/lib/proxy-scope"

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
  table.domains = {}
  table.asked = 0
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
 * What the proxy takes in hand on the platform's host. This read `config.matcher` while the matcher
 * was the allow-list. A shop may now have a domain of its own (BEELINK-283), and a matcher cannot
 * see the host: it hands over every request, and the list is `wasHandedOver()`, which the proxy
 * asks before it acts on a request to the platform's host — so what this suite asked of the
 * matcher, it now asks of that.
 */
function selects(pathname: string, cookies: readonly string[] = []): boolean {
  return wasHandedOver(pathname, (cookie) => cookies.includes(cookie))
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

/* ── A shop's own domain (BEELINK-283) ─────────────────────────────────────────────────────────── */

const STAMP = "x-bl-shop-domain"

/** A request as it arrives by a host, with whatever it carries. */
function arriving(host: string, pathname: string, init: { cookie?: string; headers?: Record<string, string>; url?: string } = {}): NextRequest {
  const headers = new Headers({ host, ...init.headers })
  if (init.cookie) headers.set("cookie", init.cookie)

  return new NextRequest(`${init.url ?? `http://${host}`}${pathname}`, { headers })
}

/** Passed on as it came: no redirect, no rewrite, nothing stored, nothing changed in what goes upstream. */
function untouched(response: Response): boolean {
  return (
    response.headers.get("x-middleware-next") === "1" &&
    response.headers.get("location") === null &&
    response.headers.get("x-middleware-rewrite") === null &&
    response.headers.get("x-middleware-override-headers") === null &&
    response.headers.getSetCookie().length === 0
  )
}

/** Where a request was rewritten to, as a path and query, or null when it was not. */
function rewrittenTo(response: Response): string | null {
  const to = response.headers.get("x-middleware-rewrite")
  if (!to) return null
  const url = new URL(to)
  return `${url.pathname}${url.search}`
}

/** The stamp the proxy put on the request that goes on to the page or the handler. */
const stampOf = (response: Response) => response.headers.get(`x-middleware-request-${STAMP}`)
const pathsOf = (response: Response, name: string) => response.headers.getSetCookie().filter((cookie) => cookie.startsWith(`${name}=`)).map((cookie) => /;\s*path=([^;]*)/i.exec(cookie)?.[1])

describe("the matcher, now that a shop may have a domain of its own", () => {
  const takes = (url: string) => unstable_doesMiddlewareMatch({ config, url })

  /** Whatever reaches a page's or a handler's code has passed the proxy: it is where a forged stamp is refused. */
  it("hands over every request that can render a page or run a handler", () => {
    for (const path of ["/", "/minha-loja", "/minha-loja/produtos/bolsa", "/produtos", "/admin/minha-loja", "/login", "/api/stores/minha-loja", "/api/storefront/minha-loja/search", "/minha-loja/api/customer/entrar", "/termos"]) {
      expect(takes(path), path).toBe(true)
    }
  })

  /** A dynamic segment takes a dot: these reach a page's or a handler's code, and so the proxy first. */
  it("hands over an address with an extension too, and lets a file through inside", async () => {
    for (const path of ["/favicon.ico", "/brand/logo.png", "/minha-loja/produtos/a.b", "/minha-loja/api/customer/a.b", "/robots.txt"]) expect(takes(path), path).toBe(true)

    for (const path of ["/favicon.ico", "/brand/logo.png", "/icon.png"]) expect(untouched(await proxy(request(path))), path).toBe(true)
  })

  it("leaves out only Next's build files and its image optimizer, which run none of this app's code", () => {
    expect(takes("/_next/static/chunks/main.js")).toBe(false)
    expect(takes("/_next/static/css/app.css")).toBe(false)
    expect(takes("/_next/image?url=%2Fbrand%2Flogo.png&w=64&q=75")).toBe(false)
  })
})

/**
 * Each condition that left the matcher. A request it kept out of the proxy now reaches it and has
 * to leave as it came: no redirect, no cookie, no call to the API. The table of shop hosts is the
 * one thing read on the way, from memory, and from the API at most once a minute (`shop-hosts.test.ts`).
 */
describe("on the platform's host, what the matcher kept out still passes untouched", () => {
  function quiet() {
    const fetched = vi.fn(async () => Response.json(SESSION, { status: 200 }))
    vi.stubGlobal("fetch", fetched)
    return fetched
  }

  it("an anonymous visitor on a shop window, its pages and its handlers", async () => {
    const fetched = quiet()

    for (const path of ["/minha-loja", "/minha-loja/produtos", "/minha-loja/produtos/bolsa?variant=v1", "/minha-loja/carrinho", "/minha-loja/entrar", "/minha-loja/lp/dia-das-maes", "/minha-loja/api/funnel", "/minha-loja/api/customer/entrar"]) {
      expect(untouched(await proxy(request(path))), path).toBe(true)
    }
    expect(fetched).not.toHaveBeenCalled()
  })

  it("a crawler, which is answered the page and never a redirect", async () => {
    const fetched = quiet()
    const crawler = (path: string) => arriving("localhost:3000", path, { headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" } })

    for (const path of ["/", "/minha-loja", "/minha-loja/produtos/bolsa", "/minha-loja/blusas?pagina=2", "/termos", "/privacidade"]) {
      const response = await proxy(crawler(path))
      expect(response.status, path).toBe(200)
      expect(untouched(response), path).toBe(true)
    }
    expect(fetched).not.toHaveBeenCalled()
  })

  it("the root, whoever asks: with a panel session it would otherwise be a redirect", async () => {
    const fetched = quiet()

    for (const cookie of [undefined, "bl_refresh=r", "bl_access=a; bl_refresh=r", "bl_shopper_refresh=r"]) expect(untouched(await proxy(request("/", cookie))), cookie).toBe(true)
    expect(fetched).not.toHaveBeenCalled()
  })

  it("a shopper whose session is alive, and one who has none — only an expired one is renewed", async () => {
    const fetched = quiet()

    expect(untouched(await proxy(request("/minha-loja/conta", "bl_shopper_refresh=r; bl_shopper_access=a")))).toBe(true)
    expect(untouched(await proxy(request("/minha-loja/conta", "bl_shopper_access=a")))).toBe(true)
    expect(fetched).not.toHaveBeenCalled()
  })

  it("a shop window with the panel's cookies alone: a shopkeeper looking at a shop renews nothing there", async () => {
    const fetched = quiet()

    expect(untouched(await proxy(request("/minha-loja", "bl_refresh=owner")))).toBe(true)
    expect(untouched(await proxy(request("/minha-loja/produtos", "bl_access=a; bl_refresh=owner")))).toBe(true)
    expect(fetched).not.toHaveBeenCalled()
  })

  it("the panel's handlers with no panel session, which answer their own 401", async () => {
    const fetched = quiet()

    expect(untouched(await proxy(request("/api/stores/loja/orders")))).toBe(true)
    expect(untouched(await proxy(request("/api/stores/loja/orders", "bl_access=a")))).toBe(true)
    expect(untouched(await proxy(request("/api/uploads", "bl_shopper_refresh=r")))).toBe(true)
    expect(fetched).not.toHaveBeenCalled()
  })

  it("the handlers that write their own cookies or a shop's, panel session or not", async () => {
    const fetched = quiet()

    for (const path of ["/api/session", "/api/session/expired", "/api/auth/login", "/api/customer/google/callback", "/api/storefront/loja/search", "/api/storefront/loja/customer/google"]) {
      expect(untouched(await proxy(request(path, "bl_refresh=r"))), path).toBe(true)
    }
    expect(fetched).not.toHaveBeenCalled()
  })

  it("the platform's legal pages, and a file, with a panel session or none", async () => {
    const fetched = quiet()

    for (const path of ["/termos", "/privacidade", "/favicon.ico", "/brand/google.svg", "/minha-loja/foto.png"]) {
      expect(untouched(await proxy(request(path))), path).toBe(true)
      expect(untouched(await proxy(request(path, "bl_access=a; bl_refresh=r"))), path).toBe(true)
    }
    expect(fetched).not.toHaveBeenCalled()
  })

  /**
   * A defect the matcher had, kept as it was: `(?!_next|api)` read "does not start with", so a shop
   * whose slug begins with `api` never has a shopper's session renewed on a page here.
   */
  it("a shop whose slug starts with api, even for a shopper whose session ran out — as the matcher had it", async () => {
    const fetched = quiet()

    expect(untouched(await proxy(request("/apiario/produtos", "bl_shopper_refresh=old")))).toBe(true)
    expect(fetched).not.toHaveBeenCalled()
    expect(selects("/apiario/produtos", ["bl_shopper_refresh"])).toBe(false)
  })

  it("and never puts the stamp of a shop's domain on a request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(SESSION, { status: 200 })))

    for (const [path, cookie] of [["/minha-loja", undefined], ["/minha-loja/produtos", "bl_shopper_refresh=old"], ["/dashboard", "bl_refresh=old"], ["/api/stores/loja/orders", "bl_refresh=old"]] as const) {
      const response = await proxy(request(path, cookie))
      expect(stampOf(response), path).toBeNull()
      expect(response.headers.get(STAMP), path).toBeNull()
    }
  })
})

describe("the stamp of a shop's own domain", () => {
  /** What reads it trusts it: only the proxy may write it, and no browser sends one. */
  it("is refused on a request that arrives carrying it, on any host and any path, before anything else", async () => {
    table.domains = { "minhaloja.com.br": "loja" }
    const fetched = vi.fn(async () => Response.json(SESSION, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    for (const [host, path] of [
      ["localhost:3000", "/loja"],
      ["localhost:3000", "/loja/api/customer/entrar"],
      ["localhost:3000", "/dashboard"],
      ["localhost:3000", "/api/stores/loja/orders"],
      ["localhost:3000", "/favicon.ico"],
      ["minhaloja.com.br", "/"],
      ["minhaloja.com.br", "/loja/api/customer/entrar"],
      ["www.minhaloja.com.br", "/"],
      ["desconhecido.example", "/loja"],
    ] as const) {
      const response = await proxy(arriving(host, path, { cookie: "bl_refresh=r; bl_shopper_refresh=s", headers: { [STAMP]: "loja" } }))

      expect(response.status, `${host}${path}`).toBe(400)
      expect(response.headers.get("location")).toBeNull()
      expect(rewrittenTo(response)).toBeNull()
    }
    expect((await proxy(arriving("localhost:3000", "/loja", { headers: { [STAMP]: "" } }))).status).toBe(400)
    expect(fetched).not.toHaveBeenCalled()
    expect(table.asked).toBe(0)
  })
})

describe("a shop with an active domain, asked for on the platform's host", () => {
  /** One address a shop: what was shared, and what an e-mail says, leads to the domain. */
  it("is sent to its domain for good, path and query kept", async () => {
    table.domains = { "minhaloja.com.br": "loja" }
    const at = async (path: string) => {
      const response = await proxy(arriving("beelink.biz", path, { url: "https://0.0.0.0:3000" }))
      return [response.status, response.headers.get("location")]
    }

    expect(await at("/loja")).toEqual([308, "https://minhaloja.com.br/"])
    expect(await at("/loja/produtos/bolsa?variant=v1&cor=azul")).toEqual([308, "https://minhaloja.com.br/produtos/bolsa?variant=v1&cor=azul"])
    expect(await at("/loja/confirmar-email?token=t&voltar=%2Floja%2Fcarrinho")).toEqual([308, "https://minhaloja.com.br/confirmar-email?token=t&voltar=%2Floja%2Fcarrinho"])
    expect(await at("/loja?curtir=p-1")).toEqual([308, "https://minhaloja.com.br/?curtir=p-1"])
  })

  it("is sent there whoever asks, a signed-in shopper included, with no call to the API", async () => {
    table.domains = { "minhaloja.com.br": "loja" }
    const fetched = vi.fn(async () => Response.json(SESSION, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await proxy(arriving("beelink.biz", "/loja/conta", { cookie: "bl_shopper_refresh=old" }))

    expect(response.headers.get("location")).toBe("https://minhaloja.com.br/conta")
    expect(response.headers.getSetCookie()).toEqual([])
    expect(fetched).not.toHaveBeenCalled()
  })

  /**
   * Https and no port — but on a developer's machine and in the e2e, where nothing terminates TLS
   * and the port is the server's own: there the request's scheme and port go on.
   */
  it("goes by the request's own scheme and port when the request arrived by a local host", async () => {
    table.domains = { "loja.localhost": "loja" }
    const to = async (host: string, url?: string) => (await proxy(arriving(host, "/loja/produtos", { url }))).headers.get("location")

    expect(await to("localhost:3100")).toBe("http://loja.localhost:3100/produtos")
    expect(await to("localhost")).toBe("http://loja.localhost/produtos")
    expect(await to("127.0.0.1:3800")).toBe("http://loja.localhost:3800/produtos")
    expect(await to("outra.localhost:3800")).toBe("http://loja.localhost:3800/produtos")
    expect(await to("[::1]:3800", "http://localhost:3800")).toBe("http://loja.localhost:3800/produtos")
    // Any other host is the open internet: https, and no port, whatever the server binds.
    expect(await to("beelink.biz:3000")).toBe("https://loja.localhost/produtos")
    expect(await to("localhost.evil.example")).toBe("https://loja.localhost/produtos")
  })

  it("is told by the forwarded host, never by the address the server binds", async () => {
    table.domains = { "minhaloja.com.br": "loja" }

    const response = await proxy(arriving("0.0.0.0:3000", "/loja/produtos", { url: "https://0.0.0.0:3000", headers: { "x-forwarded-host": "beelink.biz" } }))

    expect(response.headers.get("location")).toBe("https://minhaloja.com.br/produtos")
  })

  /** The shop's handlers keep their address on every host, and a form or a `fetch` already under way must land. */
  it("never has a handler redirected, the shop's or the platform's", async () => {
    table.domains = { "minhaloja.com.br": "loja" }

    for (const path of ["/loja/api/customer/entrar", "/loja/api/orders", "/loja/api", "/api/storefront/loja/search", "/api/stores/loja", "/api/cep/01310930"]) {
      expect(untouched(await proxy(arriving("beelink.biz", path))), path).toBe(true)
    }
  })

  it("keeps its panel where it is, and its files", async () => {
    table.domains = { "minhaloja.com.br": "loja" }

    expect((await proxy(arriving("beelink.biz", "/admin/loja/orders"))).headers.get("location")).toBe("http://beelink.biz/login?voltar=%2Fadmin%2Floja%2Forders")
    expect(untouched(await proxy(arriving("beelink.biz", "/loja/foto.png")))).toBe(true)
  })

  it("leaves every other shop where it was: one with no domain, and one whose domain is still pending", async () => {
    // The table knows the active domains alone: a pending one is not in it.
    table.domains = { "minhaloja.com.br": "loja" }

    expect(untouched(await proxy(arriving("beelink.biz", "/outra-loja/produtos")))).toBe(true)
    expect(untouched(await proxy(arriving("beelink.biz", "/")))).toBe(true)
  })
})

describe("a request that arrived by a shop's own domain", () => {
  const HOST = "minhaloja.com.br"
  const own = (pathname: string, init: Parameters<typeof arriving>[2] = {}) => arriving(HOST, pathname, init)

  it("is shown the shop's page for an address with no slug, and goes on stamped with the shop", async () => {
    table.domains = { [HOST]: "loja" }

    for (const [asked, served] of [
      ["/", "/loja"],
      ["/produtos", "/loja/produtos"],
      ["/produtos/bolsa?variant=v1", "/loja/produtos/bolsa?variant=v1"],
      ["/blusas?pagina=2&opcao=Cor%3AAzul", "/loja/blusas?pagina=2&opcao=Cor%3AAzul"],
      ["/carrinho", "/loja/carrinho"],
      ["/entrar?modo=criar&voltar=%2Fcarrinho", "/loja/entrar?modo=criar&voltar=%2Fcarrinho"],
      ["/conta/pedidos/14?pagamento=1", "/loja/conta/pedidos/14?pagamento=1"],
      ["/lp/dia-das-maes", "/loja/lp/dia-das-maes"],
    ] as const) {
      const response = await proxy(own(asked))

      expect(rewrittenTo(response), asked).toBe(served)
      expect(stampOf(response), asked).toBe("loja")
      expect(response.headers.get("location"), asked).toBeNull()
      // On the request that goes on, and never on the answer.
      expect(response.headers.get(STAMP), asked).toBeNull()
    }
  })

  it("compares the host with no port and in any case", async () => {
    table.domains = { [HOST]: "loja", "loja.localhost": "loja-2" }

    expect(rewrittenTo(await proxy(arriving("MinhaLoja.com.br", "/produtos")))).toBe("/loja/produtos")
    expect(rewrittenTo(await proxy(arriving("loja.localhost:3100", "/produtos")))).toBe("/loja-2/produtos")
    expect(rewrittenTo(await proxy(arriving("0.0.0.0:3000", "/produtos", { headers: { "x-forwarded-host": "minhaloja.com.br, internal" } })))).toBe("/loja/produtos")
  })

  it("costs an anonymous visitor and a crawler no call to the API, and stores nothing", async () => {
    table.domains = { [HOST]: "loja" }
    const fetched = vi.fn(async () => Response.json(SESSION, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    for (const cookie of [undefined, "bl_cart=x.y.1", "bl_shopper_refresh=r; bl_shopper_access=a", "bl_refresh=owner"]) {
      const response = await proxy(own("/produtos", { cookie }))
      expect(rewrittenTo(response)).toBe("/loja/produtos")
      expect(response.headers.getSetCookie()).toEqual([])
    }
    expect(fetched).not.toHaveBeenCalled()
  })

  /** One address a page: the platform's spelling of it, at the shop's domain, leads to the same page. */
  it("is sent, for good, from an address with the slug to the same one without", async () => {
    table.domains = { [HOST]: "loja" }
    const at = async (path: string) => {
      const response = await proxy(own(path))
      return [response.status, response.headers.get("location")]
    }

    expect(await at("/loja")).toEqual([308, "http://minhaloja.com.br/"])
    expect(await at("/loja/produtos/bolsa?variant=v1")).toEqual([308, "http://minhaloja.com.br/produtos/bolsa?variant=v1"])
    expect(await at("/loja?curtir=p-1")).toEqual([308, "http://minhaloja.com.br/?curtir=p-1"])
    // Only the slug itself: a page that starts the same is a page of the shop.
    expect(rewrittenTo(await proxy(own("/lojaoutra")))).toBe("/loja/lojaoutra")
  })

  it("builds that address from the host the visitor asked for, never from the one the server binds", async () => {
    table.domains = { [HOST]: "loja" }

    const response = await proxy(arriving("0.0.0.0:3000", "/loja/carrinho?cupom=VIP", { url: "https://0.0.0.0:3000", headers: { "x-forwarded-host": HOST } }))

    expect(response.headers.get("location")).toBe("https://minhaloja.com.br/carrinho?cupom=VIP")
  })

  /** `/api/customer` and `/api/storefront` are the platform's already, so the shop's handlers stay under its slug. */
  it("reaches the shop's handlers at their own address, stamped, and never rewritten or redirected", async () => {
    table.domains = { [HOST]: "loja" }

    for (const path of ["/loja/api/customer/entrar", "/loja/api/orders", "/loja/api/favorites/ids", "/loja/api"]) {
      const response = await proxy(own(path))

      expect(response.headers.get("x-middleware-next"), path).toBe("1")
      expect(rewrittenTo(response), path).toBeNull()
      expect(response.headers.get("location"), path).toBeNull()
      expect(stampOf(response), path).toBe("loja")
    }
  })

  it("lets through, as they came, Next's own files, the platform's handlers and any file — the favicon a domain's check asks for among them", async () => {
    table.domains = { [HOST]: "loja" }

    for (const path of ["/favicon.ico", "/icon.png", "/brand/google.svg", "/_next/webpack-hmr", "/api", "/api/storefront/loja/search?q=bolsa", "/api/cep/01310930", "/api/session"]) {
      const response = await proxy(own(path, { cookie: "bl_shopper_refresh=old; bl_refresh=owner" }))

      expect(untouched(response), path).toBe(true)
      expect(stampOf(response), path).toBeNull()
    }
  })

  /** The shop's footer, its cookie notice and its sign-up link to them; the API keeps both words from a category. */
  it("lets through bee-link's terms and privacy policy, which are no page of the shop", async () => {
    table.domains = { [HOST]: "loja" }

    expect(untouched(await proxy(own("/termos")))).toBe(true)
    expect(untouched(await proxy(own("/privacidade")))).toBe(true)
    // Nothing under them is the platform's.
    expect(rewrittenTo(await proxy(own("/termos/de-troca")))).toBe("/loja/termos/de-troca")
  })

  /** At one shop's domain every cookie is that shop's: another shop's handler must never be handed them. */
  it("has no other shop, and no panel: their addresses are a page of this shop, which there is none of", async () => {
    table.domains = { [HOST]: "loja" }
    const fetched = vi.fn(async () => Response.json(SESSION, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    for (const [asked, served] of [
      ["/outra/api/customer/entrar", "/loja/outra/api/customer/entrar"],
      ["/outra/produtos", "/loja/outra/produtos"],
      ["/admin/loja", "/loja/admin/loja"],
      ["/login", "/loja/login"],
      ["/dashboard", "/loja/dashboard"],
    ] as const) {
      const response = await proxy(own(asked, { cookie: "bl_refresh=owner" }))

      expect(rewrittenTo(response), asked).toBe(served)
      expect(response.headers.get("location"), asked).toBeNull()
    }
    expect(fetched).not.toHaveBeenCalled()
  })

  describe("with `www.` in front", () => {
    it("is sent, for good, to the domain without it — path, query, scheme and port kept", async () => {
      table.domains = { [HOST]: "loja", "loja.localhost": "loja-2" }
      const to = async (host: string, path: string, init: Parameters<typeof arriving>[2] = {}) => {
        const response = await proxy(arriving(host, path, init))
        return [response.status, response.headers.get("location")]
      }

      expect(await to("www.minhaloja.com.br", "/")).toEqual([308, "http://minhaloja.com.br/"])
      expect(await to("WWW.MinhaLoja.com.br", "/produtos/bolsa?variant=v1")).toEqual([308, "http://minhaloja.com.br/produtos/bolsa?variant=v1"])
      expect(await to("www.loja.localhost:3100", "/carrinho")).toEqual([308, "http://loja.localhost:3100/carrinho"])
      expect(await to("0.0.0.0:3000", "/loja/api/orders", { url: "https://0.0.0.0:3000", headers: { "x-forwarded-host": "www.minhaloja.com.br" } })).toEqual([308, "https://minhaloja.com.br/loja/api/orders"])
    })

    it("is any other host when what follows is no shop's domain", async () => {
      table.domains = { [HOST]: "loja" }

      expect(untouched(await proxy(arriving("www.outra.com.br", "/")))).toBe(true)
    })
  })

  describe("for a shopper whose access token ran out", () => {
    it("renews the session in place, through the shop the host names, on the whole site", async () => {
      table.domains = { [HOST]: "loja" }
      const fetched = vi.fn(async () => Response.json(SESSION, { status: 200 }))
      vi.stubGlobal("fetch", fetched)

      const response = await proxy(own("/conta/pedidos", { cookie: "bl_shopper_refresh=old" }))

      expect(String((fetched.mock.calls[0] as unknown[] | undefined)?.[0])).toContain("/stores/loja/customer/refresh")
      expect(rewrittenTo(response)).toBe("/loja/conta/pedidos")
      expect(response.headers.get("location")).toBeNull()
      expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "new-access", path: "/" })
      // And its twin on the slug, left by a visit before the proxy knew the domain, is expired.
      expect(pathsOf(response, "bl_shopper_access")).toEqual(["/", "/loja"])
      expect(pathsOf(response, "bl_shopper_refresh")).toEqual(["/", "/loja"])
      // The page of this very request reads the new pair, and the stamp.
      expect(response.headers.get("x-middleware-request-cookie")).toContain("bl_shopper_access=new-access")
      expect(stampOf(response)).toBe("loja")
    })

    it("renews it on the way to the shop's handlers too", async () => {
      table.domains = { [HOST]: "loja" }
      vi.stubGlobal("fetch", vi.fn(async () => Response.json(SESSION, { status: 200 })))

      const response = await proxy(own("/loja/api/customer/perfil", { cookie: "bl_shopper_refresh=old" }))

      expect(rewrittenTo(response)).toBeNull()
      expect(response.cookies.get("bl_shopper_refresh")).toMatchObject({ value: "new-refresh", path: "/" })
      expect(response.headers.get("x-middleware-request-cookie")).toContain("bl_shopper_access=new-access")
      expect(stampOf(response)).toBe("loja")
    })

    it("lets a refused shopper browse on, signed out on the site and on the slug", async () => {
      table.domains = { [HOST]: "loja" }
      vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "AUTH_TOKEN_INVALID" }, { status: 401 })))

      const response = await proxy(own("/", { cookie: "bl_shopper_refresh=old" }))

      expect(rewrittenTo(response)).toBe("/loja")
      expect(response.headers.get("location")).toBeNull()
      expect(response.cookies.get("bl_shopper_refresh")).toMatchObject({ value: "", path: "/" })
      expect(pathsOf(response, "bl_shopper_refresh")).toEqual(["/", "/loja"])
      expect(stampOf(response)).toBe("loja")
    })

    it("keeps the session through an outage, and still shows the shop", async () => {
      table.domains = { [HOST]: "loja" }
      vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connection refused") }))

      const response = await proxy(own("/produtos", { cookie: "bl_shopper_refresh=still-good" }))

      expect(rewrittenTo(response)).toBe("/loja/produtos")
      expect(response.headers.getSetCookie()).toEqual([])
      expect(stampOf(response)).toBe("loja")
    })
  })

  /** A pending domain is not in the table: to the proxy it is any host it does not know. */
  it("is the platform's, as before, while the domain is pending or is nobody's", async () => {
    const fetched = vi.fn(async () => Response.json(SESSION, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    for (const path of ["/", "/loja", "/loja/produtos", "/produtos"]) {
      const response = await proxy(arriving("aindanao.com.br", path))
      expect(untouched(response), path).toBe(true)
      expect(stampOf(response), path).toBeNull()
    }
    // And the platform's own rules hold there: a panel page with no session goes to the sign-in.
    expect((await proxy(arriving("aindanao.com.br", "/dashboard"))).headers.get("location")).toBe("http://aindanao.com.br/login?voltar=%2Fdashboard")
    expect(fetched).not.toHaveBeenCalled()
  })
})

/** The module reads the environment as it loads, so each case loads the proxy again. */
describe("WEB_DOMAIN, the platform's own host", () => {
  async function proxyWith(webDomain: string | undefined) {
    vi.resetModules()
    vi.stubEnv("WEB_DOMAIN", webDomain)
    return (await import("./proxy")).proxy
  }

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("is never looked up in the table by its host: what is no shop's page asks the table nothing", async () => {
    const named = await proxyWith("beelink.biz")

    for (const path of ["/", "/login", "/admin/loja/orders", "/dashboard", "/api/stores/loja", "/api/session", "/loja/api/customer/entrar", "/favicon.ico"]) await named(arriving("beelink.biz", path))
    await named(arriving("BeeLink.biz:443", "/login"))

    expect(table.asked).toBe(0)
  })

  /** By its slug, not by the host: a shop's page here may be one that moved to its domain. */
  it("asks the table of a shop's page there only whether that shop has a domain", async () => {
    table.domains = { "minhaloja.com.br": "loja" }
    const named = await proxyWith("beelink.biz")

    expect((await named(arriving("beelink.biz", "/loja/produtos"))).headers.get("location")).toBe("https://minhaloja.com.br/produtos")
    expect(untouched(await named(arriving("beelink.biz", "/outra/produtos")))).toBe(true)
    expect(table.asked).toBe(2)
  })

  it("leaves every other host to the table: a shop's domain opens the shop", async () => {
    table.domains = { "minhaloja.com.br": "loja" }
    const named = await proxyWith("beelink.biz")

    expect(rewrittenTo(await named(arriving("minhaloja.com.br", "/produtos")))).toBe("/loja/produtos")
    expect(table.asked).toBe(1)
  })

  /** Development and the e2e: no host is named, so each is looked up — in memory, read once a minute. */
  it("unset, has every host looked up", async () => {
    const unnamed = await proxyWith(undefined)

    await unnamed(arriving("localhost:3000", "/login"))
    await unnamed(arriving("localhost:3000", "/api/stores/loja"))

    expect(table.asked).toBe(2)
  })
})
