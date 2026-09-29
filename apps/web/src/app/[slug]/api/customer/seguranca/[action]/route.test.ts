// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

function post(action: string, fields: Record<string, string>, init: { origin?: string; cookie?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded", origin: init.origin ?? "http://localhost:3000" })
  headers.set("cookie", init.cookie ?? "bl_shopper_access=a")
  const request = new NextRequest(`http://localhost:3000/${slug}/api/customer/seguranca/${action}`, { method: "POST", headers, body: new URLSearchParams(fields).toString() })
  return POST(request, { params: Promise.resolve({ slug, action }) })
}

const here = { retorno: "/loja/conta/perfil#seguranca", entrada: "/loja/entrar" }
const change = { ...here, atual: "a-senha-de-hoje", password: "uma-senha-nova-comprida", confirmacao: "uma-senha-nova-comprida" }
const locationOf = (response: Response) => new URL(response.headers.get("location") ?? "")
const bodyOf = (fetched: ReturnType<typeof vi.fn>) => JSON.parse(String(((fetched.mock.calls[0] as unknown[])[1] as RequestInit).body)) as unknown

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shopper's own access to their account", () => {
  it("changes the password with the current one, and comes back to the section, saying so", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    const landing = locationOf(await post("trocar-senha", change))

    expect(String((fetched.mock.calls[0] as unknown[])[0])).toContain("/stores/loja/customer/me/password")
    expect(bodyOf(fetched)).toEqual({ currentPassword: "a-senha-de-hoje", newPassword: "uma-senha-nova-comprida" })
    expect(landing.pathname).toBe("/loja/conta/perfil")
    expect(landing.hash).toBe("#seguranca")
    expect(landing.searchParams.get("aviso")).toBe("senha-trocada")
  })

  it("sends two different new passwords back without a call, and a refusal back with its code", async () => {
    const fetched = vi.fn(async () => Response.json({ errorCode: "AUTH_PASSWORD_WRONG" }, { status: 403 }))
    vi.stubGlobal("fetch", fetched)

    const mismatch = locationOf(await post("trocar-senha", { ...change, confirmacao: "outra-coisa-qualquer" }))
    expect(fetched).not.toHaveBeenCalled()
    expect(mismatch.searchParams.get("erro-seguranca")).toBe("CUSTOMER_PASSWORD_MISMATCH")

    expect(locationOf(await post("trocar-senha", change)).searchParams.get("erro-seguranca")).toBe("AUTH_PASSWORD_WRONG")

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "BAD_REQUEST" }, { status: 400 })))
    expect(locationOf(await post("trocar-senha", change)).searchParams.get("erro-seguranca")).toBe("CUSTOMER_PASSWORD_INVALID")
  })

  it("asks for the link that creates a password, bringing the shopper back to this page", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 202 }))
    vi.stubGlobal("fetch", fetched)

    const landing = locationOf(await post("criar-senha", here))

    expect(String((fetched.mock.calls[0] as unknown[])[0])).toContain("/stores/loja/customer/me/password/link")
    expect(bodyOf(fetched)).toEqual({ returnTo: "/loja/conta/perfil" })
    expect(landing.searchParams.get("aviso")).toBe("link-senha")
  })

  it("signs out of every device and lands on the shop's sign-in, told so, its cookies gone", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post("sair-de-todos", here)
    const landing = locationOf(response)

    expect(((fetched.mock.calls[0] as unknown[])[1] as RequestInit).method).toBe("DELETE")
    expect(landing.pathname).toBe("/loja/entrar")
    expect(landing.searchParams.get("saiu")).toBe("1")
    expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
  })

  it("sends a session that ended elsewhere to the sign-in, told so, on its way back to the form", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "AUTH_UNAUTHENTICATED" }, { status: 401 })))

    const response = await post("sair-de-todos", here, { cookie: "bl_shopper_access=old" })
    const landing = locationOf(response)

    expect(landing.pathname).toBe("/loja/entrar")
    expect(landing.searchParams.get("erro")).toBe("CUSTOMER_SESSION_ENDED")
    expect(landing.searchParams.get("voltar")).toBe("/loja/conta/perfil#seguranca")
    expect(landing.searchParams.has("saiu")).toBe(false)
    expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
  })

  it("behind the proxy, lands on the site the shopper is on, never the server's bind address", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })))
    const request = new NextRequest("https://0.0.0.0:3000/loja/api/customer/seguranca/sair-de-todos", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://link.beecoders.net",
        "x-forwarded-host": "link.beecoders.net",
        cookie: "bl_shopper_access=a",
      },
      body: new URLSearchParams(here).toString(),
    })

    const landing = locationOf(await POST(request, { params: Promise.resolve({ slug: "loja", action: "sair-de-todos" }) }))

    expect(landing.origin).toBe("https://link.beecoders.net")
    expect(landing.pathname).toBe("/loja/entrar")
  })

  it("answers only this shop's own forms, and keeps every landing inside it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })))

    expect((await post("apagar-conta", here)).status).toBe(404)
    expect((await post("trocar-senha", change, { origin: "https://evil.example" })).status).toBe(403)
    expect(locationOf(await post("sair-de-todos", { ...here, entrada: "https://evil.example/x" })).origin).toBe("http://localhost:3000")
  })
})
