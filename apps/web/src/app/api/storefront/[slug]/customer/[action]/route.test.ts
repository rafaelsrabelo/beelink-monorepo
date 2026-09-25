// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const SESSION = {
  accessToken: "shopper-access",
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: "shopper-refresh",
  refreshTokenExpiresAt: new Date(Date.now() + 2_592_000_000).toISOString(),
  user: { id: "1", name: "Bia", email: "bia@exemplo.com", emailVerified: true, createdAt: "" },
}

function post(action: string, fields: Record<string, string>, init: { origin?: string | null; cookie?: string } = {}) {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)

  const request = new NextRequest(`http://localhost:3000/api/storefront/loja/customer/${action}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(fields).toString(),
  })
  return POST(request, { params: Promise.resolve({ slug: "loja", action }) })
}

const form = { email: "bia@exemplo.com", password: "uma-senha-comprida", voltar: "/loja/carrinho", retorno: "/loja/entrar" }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shop's sign-in form", () => {
  it("signs in through the shop's door, keeps the pair in httpOnly cookies and returns where the shopper was", async () => {
    const fetched = vi.fn(async () => Response.json(SESSION, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post("entrar", form)

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("http://localhost:3000/loja/carrinho")
    expect(String((fetched.mock.calls[0] as unknown[] | undefined)?.[0])).toContain("/stores/loja/customer/login")
    expect(response.cookies.get("bl_customer_access")).toMatchObject({ value: "shopper-access", httpOnly: true, path: "/" })
    // Never the panel's cookies: one person may be both, and the two sessions stay apart.
    expect(response.cookies.get("bl_access")).toBeUndefined()
  })

  it("comes back to the sign-in page with the refusal, the address kept", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 401, errorCode: "AUTH_INVALID_CREDENTIALS", message: "x" }, { status: 401 })))

    const location = new URL((await post("entrar", form)).headers.get("location") ?? "")

    expect(location.pathname).toBe("/loja/entrar")
    expect(location.searchParams.get("erro")).toBe("AUTH_INVALID_CREDENTIALS")
    expect(location.searchParams.get("email")).toBe("bia@exemplo.com")
    expect(location.searchParams.get("voltar")).toBe("/loja/carrinho")
  })

  it("never follows a return path out of the shop", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(SESSION, { status: 200 })))

    for (const voltar of ["https://evil.example", "//evil.example", "/outra-loja", "/loja//evil.example"]) {
      expect((await post("entrar", { ...form, voltar })).headers.get("location")).toBe("http://localhost:3000/loja")
    }
  })

  it("signs up and says the link is on its way — the same whatever the API knew about the address", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 202 })))

    const location = new URL((await post("criar", { ...form, name: "Bia" })).headers.get("location") ?? "")

    expect(location.searchParams.get("modo")).toBe("criar")
    expect(location.searchParams.get("enviado")).toBe("1")
  })

  it("asks for a new password through the account's own door", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 202 }))
    vi.stubGlobal("fetch", fetched)

    const location = new URL((await post("senha", { email: "bia@exemplo.com", retorno: "/loja/entrar" })).headers.get("location") ?? "")

    expect(String((fetched.mock.calls[0] as unknown[] | undefined)?.[0])).toContain("/auth/forgot-password")
    expect(location.searchParams.get("modo")).toBe("senha")
    expect(location.searchParams.get("enviado")).toBe("1")
  })

  it("signs out, the cookies going whether or not the API answered", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline") }))

    const response = await post("sair", {}, { cookie: "bl_customer_refresh=r; bl_customer_access=a" })

    expect(response.headers.get("location")).toBe("http://localhost:3000/loja")
    expect(response.cookies.get("bl_customer_refresh")?.value).toBe("")
  })

  it("refuses a post from another site", async () => {
    expect((await post("entrar", form, { origin: "https://evil.example" })).status).toBe(403)
  })
})
