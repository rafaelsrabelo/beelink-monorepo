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

const saved = { id: "0199aaaa-bbbb-7ccc-8ddd-eeeeffff0001", label: "Casa", recipientName: null, isDefault: true }

function post(action: string, fields: Record<string, string>, init: { origin?: string | null; cookie?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  headers.set("cookie", init.cookie ?? "bl_shopper_access=a")

  const request = new NextRequest(`http://localhost:3000/${slug}/api/customer/enderecos/${action}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(fields).toString(),
  })
  return POST(request, { params: Promise.resolve({ slug, action }) })
}

const address = { label: "Casa", recipientName: "", zipCode: "60160-230", street: "Rua Tibúrcio Cavalcante", number: "1200", complement: "", neighborhood: "Meireles", city: "Fortaleza", state: "ce" }
const locationOf = (response: Response) => new URL(response.headers.get("location") ?? "")
const callOf = (fetched: ReturnType<typeof vi.fn>, index = 0) => (fetched.mock.calls[index] ?? []) as unknown as [string, RequestInit]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shopper's address forms", () => {
  it("saves a new address whole, and lands where it came from with what it did and the address to deliver to", async () => {
    const fetched = vi.fn(async () => Response.json(saved, { status: 201 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post("salvar", { ...address, isDefault: "1", entregar: "1", retorno: "/loja/carrinho", formulario: "/loja/conta/perfil?endereco=novo" })
    const [url, init] = callOf(fetched)

    expect(url).toContain("/stores/loja/customer/addresses")
    expect(init.method).toBe("POST")
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer a")
    // Every part sent, blank as it came: the API reads blank as not given.
    expect(JSON.parse(String(init.body))).toEqual({ ...address, isDefault: true })
    expect(response.status).toBe(303)
    const landing = locationOf(response)
    expect(landing.pathname).toBe("/loja/carrinho")
    expect(landing.searchParams.get("aviso")).toBe("endereco-salvo")
    expect(landing.searchParams.get("entregar")).toBe(saved.id)
  })

  it("replaces one it has an id for, never making it the default unless asked, and back on the profile names none to deliver to", async () => {
    const fetched = vi.fn(async () => Response.json({ ...saved, isDefault: false }, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post("salvar", { ...address, id: saved.id, retorno: "/loja/conta/perfil" })
    const [url, init] = callOf(fetched)

    expect(url).toContain(`/stores/loja/customer/addresses/${saved.id}`)
    expect(init.method).toBe("PUT")
    expect(JSON.parse(String(init.body))).toMatchObject({ isDefault: false })
    expect(locationOf(response).searchParams.has("entregar")).toBe(false)
  })

  it("removes one and makes one the default, each by its own call", async () => {
    const fetched = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(Response.json(saved, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    const removed = await post("remover", { id: saved.id, retorno: "/loja/conta/perfil" })
    const made = await post("padrao", { id: saved.id, retorno: "/loja/conta/perfil" })

    expect(callOf(fetched, 0)[1].method).toBe("DELETE")
    expect(callOf(fetched, 1)[0]).toContain(`/addresses/${saved.id}/default`)
    expect(locationOf(removed).searchParams.get("aviso")).toBe("endereco-removido")
    expect(locationOf(made).searchParams.get("aviso")).toBe("endereco-padrao")
  })

  it("comes back to the cards themselves, where what it did is said", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })))

    const landing = locationOf(await post("remover", { id: saved.id, retorno: "/loja/conta/perfil#enderecos" }))

    expect(landing.pathname).toBe("/loja/conta/perfil")
    expect(landing.hash).toBe("#enderecos")
    expect(landing.searchParams.get("aviso")).toBe("endereco-removido")
  })

  it("brings a refusal back to the form, saying the address at large or the API's own word", async () => {
    const fields = { ...address, retorno: "/loja/carrinho", formulario: "/loja/conta/perfil?endereco=novo&voltar=%2Floja%2Fcarrinho" }

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "BAD_REQUEST" }, { status: 400 })))
    const invalid = locationOf(await post("salvar", fields))
    expect(invalid.pathname).toBe("/loja/conta/perfil")
    expect(invalid.searchParams.get("endereco")).toBe("novo")
    expect(invalid.searchParams.get("voltar")).toBe("/loja/carrinho")
    expect(invalid.searchParams.get("erro-endereco")).toBe("CUSTOMER_ADDRESS_FIELDS_INVALID")

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "CUSTOMER_ADDRESS_LIMIT" }, { status: 409 })))
    expect(locationOf(await post("salvar", fields)).searchParams.get("erro-endereco")).toBe("CUSTOMER_ADDRESS_LIMIT")

    vi.stubGlobal("fetch", vi.fn(async () => null as unknown as Response).mockRejectedValue(new Error("down")))
    expect(locationOf(await post("remover", { id: saved.id, retorno: "/loja/conta/perfil" })).searchParams.get("erro-endereco")).toBe("UNKNOWN")
  })

  it("calls the API with nothing but an address's id in its path", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    for (const [action, id] of [["remover", ".."], ["padrao", ""], ["salvar", "../default"]] as const) {
      const landing = locationOf(await post(action, { ...address, id, retorno: "/loja/conta/perfil#enderecos" }))
      expect(landing.searchParams.get("erro-endereco"), `${action} ${id}`).toBe("CUSTOMER_ADDRESS_NOT_FOUND")
    }
    expect(fetched).not.toHaveBeenCalled()
  })

  it("keeps every landing inside the shop, and answers only this shop's own forms", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(saved, { status: 201 })))

    expect(locationOf(await post("salvar", { ...address, retorno: "https://evil.example/x" })).origin).toBe("http://localhost:3000")
    expect((await post("apagar-tudo", {})).status).toBe(404)
    expect((await post("salvar", address, { origin: "https://evil.example" })).status).toBe(403)
  })

  it("signs a shopper whose session cannot be renewed out, back to the shop", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "AUTH_UNAUTHENTICATED" }, { status: 401 })))

    const response = await post("remover", { id: saved.id }, { cookie: "bl_shopper_access=old" })

    expect(locationOf(response).pathname).toBe("/loja")
    expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
  })

  it("keeps a pair renewed on the way", async () => {
    const fetched = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ errorCode: "AUTH_UNAUTHENTICATED" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json(SESSION, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post("remover", { id: saved.id, retorno: "/loja/conta/perfil" }, { cookie: "bl_shopper_access=old; bl_shopper_refresh=r" })

    expect(locationOf(response).searchParams.get("aviso")).toBe("endereco-removido")
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "shopper-access", path: "/loja" })
  })
})
