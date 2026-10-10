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

const CODE = "c".repeat(43)
const VERIFIER = "v".repeat(43)
const flightOf = (fields: Record<string, string>) => `bl_oauth_google=${encodeURIComponent(new URLSearchParams(fields).toString())}`
const FLIGHT = flightOf({ verifier: VERIFIER, signIn: "/entrar?modo=criar", back: "/carrinho" })

/** As the proxy hands it on: stamped at the shop's own domain, bare at the platform's host. */
function arrive(query: string, { cookie = FLIGHT as string | null, slug = "loja", host = "loja.com.br", stamp = "loja" as string | null } = {}) {
  const headers = new Headers({ host })
  if (cookie) headers.set("cookie", cookie)
  if (stamp) headers.set("x-bl-shop-domain", stamp)
  return GET(new NextRequest(`https://${host}/${slug}/api/customer/google/session?${query}`, { headers }), { params: Promise.resolve({ slug }) })
}

const traded = (returnTo: string | null = "/loja/carrinho") => vi.fn(async () => Response.json({ session: SESSION, returnTo }))
const refused = (errorCode = "GOOGLE_STATE_INVALID", status = 400) => vi.fn(async () => Response.json({ statusCode: status, errorCode, message: "" }, { status }))
const setCookies = (response: Response) => response.headers.getSetCookie()

afterEach(() => vi.unstubAllGlobals())

describe("GET /[slug]/api/customer/google/session", () => {
  it("trades the code with the secret this browser kept, stores the session on the whole site and goes where the shopper was", async () => {
    const fetched = traded()
    vi.stubGlobal("fetch", fetched)

    const response = await arrive(`code=${CODE}`)

    expect(response.status).toBe(303)
    // The API spells the return the platform's way; here it is the page it names, and the code is gone.
    expect(response.headers.get("location")).toBe("https://loja.com.br/carrinho")
    const [url, init] = fetched.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe("http://api.test/api/stores/loja/customer/google/handoff")
    expect(JSON.parse(String(init.body))).toEqual({ code: CODE, verifier: VERIFIER })

    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "shopper-access", httpOnly: true, path: "/", sameSite: "lax" })
    expect(response.cookies.get("bl_shopper_refresh")).toMatchObject({ value: "shopper-refresh", httpOnly: true, path: "/" })
    const cookies = setCookies(response)
    // The pair's twins on the platform's path go with every write, as at the password door.
    expect(cookies).toContain("bl_shopper_access=; Path=/loja; Max-Age=0; HttpOnly; SameSite=Lax")
    expect(cookies).toContain("bl_shopper_refresh=; Path=/loja; Max-Age=0; HttpOnly; SameSite=Lax")
    // The secret is spent with the code.
    expect(cookies.some((cookie) => /^bl_oauth_google=;/.test(cookie) && cookie.includes("Path=/loja/api/customer/google"))).toBe(true)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")
  })

  it("never answers with the code or the secret in an address, signed in or refused", async () => {
    for (const fetched of [traded(), refused(), refused("RATE_LIMITED", 429), vi.fn(async () => Promise.reject(new Error("down")))]) {
      vi.stubGlobal("fetch", fetched)

      const response = await arrive(`code=${CODE}`)

      expect(response.status).toBe(303)
      const location = response.headers.get("location") ?? ""
      expect(location).not.toContain(CODE)
      expect(location).not.toContain(VERIFIER)
      expect(new URL(location).searchParams.has("code")).toBe(false)
    }
  })

  // Where it leads is this shop, on this host: nothing in the address or the cookie moves it.
  it("stays on this host whatever the address, the cookie or the API say about where to go", async () => {
    vi.stubGlobal("fetch", traded("https://evil.example/"))
    const signedIn = await arrive(`code=${CODE}&voltar=https%3A%2F%2Fevil.example&retorno=%2F%2Fevil.example&host=evil.example`, {
      cookie: flightOf({ verifier: VERIFIER, signIn: "//evil.example", back: "https://evil.example" }),
    })
    expect(signedIn.headers.get("location")).toBe("https://loja.com.br/")

    vi.stubGlobal("fetch", refused())
    const turnedAway = await arrive(`code=${CODE}&voltar=https%3A%2F%2Fevil.example`, { cookie: flightOf({ verifier: VERIFIER, signIn: "//evil.example", back: "https://evil.example" }) })
    const location = new URL(turnedAway.headers.get("location") ?? "")
    expect(location.origin).toBe("https://loja.com.br")
    expect(location.searchParams.get("voltar")).toBe("/")
  })

  it("lands a refusal on the face the shopper left, saying why, with no session", async () => {
    vi.stubGlobal("fetch", refused())

    const response = await arrive(`code=${CODE}`)

    const location = new URL(response.headers.get("location") ?? "")
    expect(location.origin).toBe("https://loja.com.br")
    expect(location.pathname).toBe("/entrar")
    expect(location.searchParams.get("modo")).toBe("criar")
    expect(location.searchParams.get("voltar")).toBe("/carrinho")
    expect(location.searchParams.get("erro")).toBe("GOOGLE_STATE_INVALID")
    expect(setCookies(response).join("\n")).not.toMatch(/bl_shopper_(access|refresh)=[^;]/)
  })

  /**
   * Someone's own sign-in, sent as a link to another person: that browser began no flow and holds no
   * secret. It is signed into nothing, and the code is spent so it opens nothing later either.
   */
  it("signs nobody in where no flow began, and still spends the code", async () => {
    const fetched = refused()
    vi.stubGlobal("fetch", fetched)

    const response = await arrive(`code=${CODE}`, { cookie: null })

    expect(response.headers.get("location")).toBe("https://loja.com.br/")
    expect(setCookies(response).join("\n")).not.toMatch(/bl_shopper_(access|refresh)=[^;]/)
    const [, init] = fetched.mock.calls[0]! as unknown as [string, RequestInit]
    const sent = JSON.parse(String(init.body)) as { code: string; verifier: string }
    expect(sent.code).toBe(CODE)
    expect(sent.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(sent.verifier).not.toBe(VERIFIER)
  })

  // Even if the API were to hand a session back: with no secret of this browser's, none is stored.
  it("stores no session without this browser's own secret, whatever the API answers", async () => {
    vi.stubGlobal("fetch", traded())

    for (const cookie of [null, flightOf({ verifier: "short", signIn: "/entrar", back: "/" })]) {
      const response = await arrive(`code=${CODE}`, { cookie })
      expect(setCookies(response).join("\n")).not.toMatch(/bl_shopper_(access|refresh)=[^;]/)
    }
  })

  it("asks the API nothing for a code that is not shaped like one", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    for (const query of ["", "code=", "code=curto", `code=${CODE}x`, "code=..%2F..%2Fadmin"]) {
      const response = await arrive(query)
      expect(new URL(response.headers.get("location") ?? "").searchParams.get("erro")).toBe("GOOGLE_STATE_INVALID")
    }
    expect(fetched).not.toHaveBeenCalled()
  })

  // The minute before the proxy learns of the domain: the handler answers as the platform's host does.
  it("stores the session on the shop's path when the request did not come by the shop's own domain", async () => {
    vi.stubGlobal("fetch", traded())

    const response = await arrive(`code=${CODE}`, { stamp: null, cookie: flightOf({ verifier: VERIFIER, signIn: "/loja/entrar", back: "/loja/carrinho" }) })

    expect(response.headers.get("location")).toBe("https://loja.com.br/loja/carrinho")
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ path: "/loja" })
    expect(setCookies(response).join("\n")).not.toContain("Max-Age=0; HttpOnly")
  })

  it("answers 404 to a slug that is not one", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await arrive(`code=${CODE}`, { slug: "/evil.example" })).status).toBe(404)
  })
})
