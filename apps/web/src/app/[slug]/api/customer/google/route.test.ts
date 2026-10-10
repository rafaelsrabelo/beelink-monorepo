// Node
import { createHash } from "node:crypto"

// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

/** As the proxy hands it on: stamped at the shop's own domain, bare at the platform's host. */
function start(query: string, { slug = "loja", host = "loja.com.br", stamp = "loja" as string | null, headers = {} as Record<string, string> } = {}) {
  const sent = new Headers({ host, ...headers })
  if (stamp) sent.set("x-bl-shop-domain", stamp)
  return GET(new NextRequest(`https://${host}/${slug}/api/customer/google?${query}`, { headers: sent }), { params: Promise.resolve({ slug }) })
}

const options = (body: unknown, status = 200) => vi.fn(async () => Response.json(body, { status }))
const cookieOf = (response: Response) => new URLSearchParams(decodeURIComponent(/bl_oauth_google=([^;]*)/.exec(response.headers.get("set-cookie") ?? "")?.[1] ?? ""))

afterEach(() => vi.unstubAllGlobals())

describe("GET /[slug]/api/customer/google", () => {
  it("sends the shopper to the platform's host to begin, with the hash of a secret it keeps at this domain", async () => {
    const fetched = options({ google: true, platformOrigin: "https://beelink.biz" })
    vi.stubGlobal("fetch", fetched)

    const response = await start("voltar=%2Fcarrinho&retorno=%2Fentrar%3Fmodo%3Dcriar")

    expect(response.status).toBe(303)
    const location = new URL(response.headers.get("location") ?? "")
    expect(`${location.origin}${location.pathname}`).toBe("https://beelink.biz/api/storefront/loja/customer/google")
    // Spelled the platform's way, which is what its start keeps to.
    expect(location.searchParams.get("voltar")).toBe("/loja/carrinho")
    expect(location.searchParams.get("retorno")).toBe("/loja/entrar?modo=criar")
    expect([...location.searchParams.keys()].sort()).toEqual(["desafio", "retorno", "voltar"])

    const [url, init] = fetched.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe("http://api.test/api/customer/sign-in-options")
    expect(init.method).toBe("GET")

    const kept = cookieOf(response)
    expect(kept.get("verifier")).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(createHash("sha256").update(kept.get("verifier") ?? "").digest("base64url")).toBe(location.searchParams.get("desafio"))
    // This domain's own addresses, for a refusal to land on.
    expect(kept.get("signIn")).toBe("/entrar?modo=criar")
    expect(kept.get("back")).toBe("/carrinho")
    // The secret is in the cookie alone: never in the address the browser is sent to.
    expect(response.headers.get("location")).not.toContain(kept.get("verifier"))
    const cookie = response.headers.get("set-cookie") ?? ""
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=lax/i)
    expect(cookie).toContain("Path=/loja/api/customer/google")
    expect(cookie).toContain("Max-Age=600")
  })

  it("makes a new secret for every flow", async () => {
    vi.stubGlobal("fetch", options({ google: true, platformOrigin: "https://beelink.biz" }))

    const [one, two] = [await start(""), await start("")]

    expect(cookieOf(one).get("verifier")).not.toBe(cookieOf(two).get("verifier"))
  })

  // Where the flow begins is the API's to say, and nothing a request carries.
  it("takes the platform's origin from the API alone", async () => {
    vi.stubGlobal("fetch", options({ google: true, platformOrigin: "https://beelink.biz" }))

    const response = await start("voltar=https%3A%2F%2Fevil.example&retorno=%2F%2Fevil.example&origem=https%3A%2F%2Fevil.example&host=evil.example", {
      headers: { referer: "https://evil.example/", origin: "https://evil.example" },
    })

    const location = new URL(response.headers.get("location") ?? "")
    expect(location.origin).toBe("https://beelink.biz")
    expect(location.searchParams.get("voltar")).toBe("/loja")
    expect(location.searchParams.get("retorno")).toBe("/loja")
    expect(response.headers.get("location")).not.toContain("evil.example")
  })

  it("goes back to the sign-in page of this domain when Google is not set up, or the API does not say where to begin", async () => {
    for (const [fetched, erro] of [
      [options({ google: false, platformOrigin: "https://beelink.biz" }), "GOOGLE_SIGN_IN_UNAVAILABLE"],
      [options({ google: true }), "GOOGLE_SIGN_IN_UNAVAILABLE"],
      [options({ google: true, platformOrigin: "nowhere" }), "GOOGLE_SIGN_IN_UNAVAILABLE"],
      [options({ statusCode: 500 }, 500), "UNKNOWN"],
      [vi.fn(async () => Promise.reject(new Error("down"))), "UNKNOWN"],
    ] as const) {
      vi.stubGlobal("fetch", fetched)

      const response = await start("voltar=%2Fcarrinho&retorno=%2Fentrar")

      const location = new URL(response.headers.get("location") ?? "")
      expect(location.origin).toBe("https://loja.com.br")
      expect(location.pathname).toBe("/entrar")
      expect(location.searchParams.get("voltar")).toBe("/carrinho")
      expect(location.searchParams.get("erro")).toBe(erro)
      expect(response.headers.get("set-cookie") ?? "").not.toContain("bl_oauth_google")
    }
  })

  it("leaves it to the platform's own start by the platform's host, with no secret and no challenge", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    const response = await start("voltar=%2Floja%2Fcarrinho&retorno=%2Floja%2Fentrar", { host: "beelink.biz", stamp: null })

    const location = new URL(response.headers.get("location") ?? "")
    expect(`${location.origin}${location.pathname}`).toBe("https://beelink.biz/api/storefront/loja/customer/google")
    expect(location.searchParams.get("voltar")).toBe("/loja/carrinho")
    expect(location.searchParams.has("desafio")).toBe(false)
    expect(response.headers.get("set-cookie")).toBeNull()
    expect(fetched).not.toHaveBeenCalled()
  })

  it("answers 404 to a slug that is not one", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await start("", { slug: "/evil.example" })).status).toBe(404)
  })
})
