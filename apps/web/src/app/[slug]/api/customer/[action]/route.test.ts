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

function post(action: string, fields: Record<string, string>, init: { origin?: string | null; cookie?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)

  const request = new NextRequest(`http://localhost:3000/loja/api/customer/${action}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(fields).toString(),
  })
  return POST(request, { params: Promise.resolve({ slug, action }) })
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
    // On the shop's path: the session is this shop's, and another shop's pages never receive it.
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "shopper-access", httpOnly: true, path: "/loja" })
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

  it("answers a slug that is not one with 404, before it can become an address off the site", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    // The segment arrives decoded: `%2Fevil.example` is `/evil.example`, and `/` + it is `//evil.example`.
    for (const slug of ["/evil.example", "\\evil.example"]) {
      for (const action of ["entrar", "sair", "perfil"]) {
        const response = await post(action, { ...form, voltar: "", retorno: "" }, {}, slug)
        expect(response.status).toBe(404)
        expect(response.headers.get("location")).toBeNull()
      }
    }
    expect(fetched).not.toHaveBeenCalled()
  })

  it("asks the shop for a new confirmation link, and says on its sign-up face where it went", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 202 }))
    vi.stubGlobal("fetch", fetched)

    const location = new URL((await post("reenviar", { email: "bia@exemplo.com", retorno: "/loja/entrar" })).headers.get("location") ?? "")

    expect(String((fetched.mock.calls[0] as unknown[] | undefined)?.[0])).toContain("/stores/loja/customer/resend-verification")
    expect(location.pathname).toBe("/loja/entrar")
    expect(location.searchParams.get("modo")).toBe("criar")
    expect(location.searchParams.get("enviado")).toBe("1")
    expect(location.searchParams.get("email")).toBe("bia@exemplo.com")
  })

  it("signs up and says the link is on its way — the same whatever the API knew about the address", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 202 })))

    const location = new URL((await post("criar", { ...form, name: "Bia" })).headers.get("location") ?? "")

    expect(location.searchParams.get("modo")).toBe("criar")
    expect(location.searchParams.get("enviado")).toBe("1")
  })

  it("asks for a new password at the shop the account belongs to", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 202 }))
    vi.stubGlobal("fetch", fetched)

    const location = new URL((await post("senha", { email: "bia@exemplo.com", retorno: "/loja/entrar" })).headers.get("location") ?? "")

    expect(String((fetched.mock.calls[0] as unknown[] | undefined)?.[0])).toContain("/stores/loja/customer/forgot-password")
    expect(location.searchParams.get("modo")).toBe("senha")
    expect(location.searchParams.get("enviado")).toBe("1")
  })

  it("signs out, the cookies going whether or not the API answered", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline") }))

    const response = await post("sair", {}, { cookie: "bl_shopper_refresh=r; bl_shopper_access=a" })

    expect(response.headers.get("location")).toBe("http://localhost:3000/loja")
    expect(response.cookies.get("bl_shopper_refresh")).toMatchObject({ value: "", path: "/loja" })
  })

  it("saves the shopper's details with their token, and comes back saying so", async () => {
    const fetched = vi.fn(async () => Response.json({ id: "c1" }, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post("perfil", { name: "Bia", phone: "(11) 98888-7777", city: "São Paulo", retorno: "/loja/conta" }, { cookie: "bl_shopper_access=a" })
    const [url, init] = (fetched.mock.calls[0] ?? []) as unknown as [string, RequestInit]

    expect(url).toContain("/stores/loja/customer/me")
    expect(init.method).toBe("PATCH")
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer a")
    expect(JSON.parse(String(init.body))).toMatchObject({ name: "Bia", phone: "(11) 98888-7777", address: { city: "São Paulo", street: "" } })
    expect(response.headers.get("location")).toBe("http://localhost:3000/loja/conta?salvo=1")
  })

  it("renews a token that ran out since the page loaded, once, and keeps the new pair", async () => {
    const fetched = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ errorCode: "AUTH_UNAUTHENTICATED" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json(SESSION, { status: 200 }))
      .mockResolvedValueOnce(Response.json({ id: "c1" }, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post("perfil", { name: "Bia", retorno: "/loja/conta" }, { cookie: "bl_shopper_access=old; bl_shopper_refresh=r" })

    expect(response.headers.get("location")).toBe("http://localhost:3000/loja/conta?salvo=1")
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "shopper-access", path: "/loja" })
    expect(fetched).toHaveBeenCalledTimes(3)
  })

  it("says what to fix when the details are refused", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "BAD_REQUEST" }, { status: 400 })))

    const location = new URL((await post("perfil", { phone: "12", retorno: "/loja/conta" }, { cookie: "bl_shopper_access=a" })).headers.get("location") ?? "")

    expect(location.searchParams.get("erro")).toBe("CUSTOMER_FIELDS_INVALID")
  })

  it("brings a refusal back to the form, still on its way to the cart, and a save to the cart", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "CUSTOMER_PHONE_TAKEN" }, { status: 409 })))
    const fields = { phone: "(11) 97777-6666", retorno: "/loja/carrinho", formulario: "/loja/conta?voltar=%2Floja%2Fcarrinho" }

    const refused = new URL((await post("perfil", fields, { cookie: "bl_shopper_access=a" })).headers.get("location") ?? "")

    expect(refused.pathname).toBe("/loja/conta")
    expect(refused.searchParams.get("voltar")).toBe("/loja/carrinho")
    expect(refused.searchParams.get("erro")).toBe("CUSTOMER_PHONE_TAKEN")

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: "c1" }, { status: 200 })))
    expect((await post("perfil", fields, { cookie: "bl_shopper_access=a" })).headers.get("location")).toBe("http://localhost:3000/loja/carrinho?salvo=1")
  })

  it("keeps a refusal inside the shop, whatever the form says it came from", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "CUSTOMER_PHONE_TAKEN" }, { status: 409 })))

    const location = (await post("perfil", { retorno: "/loja/conta", formulario: "https://evil.example/x" }, { cookie: "bl_shopper_access=a" })).headers.get("location")

    expect(new URL(location ?? "").origin).toBe("http://localhost:3000")
  })

  it("refuses a post from another site", async () => {
    expect((await post("entrar", form, { origin: "https://evil.example" })).status).toBe(403)
  })
})
