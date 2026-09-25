// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

function start(query: string) {
  const request = new NextRequest(`http://localhost:3000/api/storefront/loja/customer/google?${query}`)
  return GET(request, { params: Promise.resolve({ slug: "loja" }) })
}

afterEach(() => vi.unstubAllGlobals())

describe("GET /api/storefront/[slug]/customer/google", () => {
  it("opens the flow at the API, holds its state to this browser, and sends the shopper to Google", async () => {
    const fetched = vi.fn(async () => Response.json({ url: "https://accounts.google.com/o/oauth2/v2/auth?state=abc", state: "abc" }))
    vi.stubGlobal("fetch", fetched)

    const response = await start("voltar=%2Floja%2Fcarrinho&retorno=%2Floja%2Fentrar")

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("https://accounts.google.com/o/oauth2/v2/auth?state=abc")
    const [url, init] = fetched.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe("http://api.test/api/stores/loja/customer/google/authorize")
    expect(JSON.parse(String(init.body))).toEqual({ returnTo: "/loja/carrinho" })

    const cookie = response.headers.get("set-cookie") ?? ""
    expect(cookie).toContain("bl_oauth_google=")
    expect(cookie).toContain("state%3Dabc")
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toContain("Path=/api/customer/google/callback")
  })

  it("keeps where to return inside the shop, whatever the address says", async () => {
    const fetched = vi.fn(async () => Response.json({ url: "https://accounts.google.com/x", state: "abc" }))
    vi.stubGlobal("fetch", fetched)

    await start("voltar=https%3A%2F%2Fevil.example")

    const [, init] = fetched.mock.calls[0]! as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ returnTo: "/loja" })
  })

  it("goes back to the sign-in page, saying why, when the API cannot start the flow", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 404, errorCode: "GOOGLE_SIGN_IN_UNAVAILABLE", message: "" }, { status: 404 })))

    const response = await start("voltar=%2Floja%2Fcarrinho&retorno=%2Floja%2Fentrar")

    const location = new URL(response.headers.get("location") ?? "")
    expect(location.pathname).toBe("/loja/entrar")
    expect(location.searchParams.get("erro")).toBe("GOOGLE_SIGN_IN_UNAVAILABLE")
    expect(response.headers.get("set-cookie") ?? "").not.toContain("bl_oauth_google")
  })
})
