// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const PURCHASE = { accessToken: "purchase-token", accessTokenExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() }
const back = "/loja/carrinho?cupom=BEMVINDO10#finalizar"

function post(step: string, fields: Record<string, string>, init: { origin?: string | null; cookie?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": "203.0.113.7" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)
  const request = new NextRequest(`http://localhost:3000/${slug}/api/customer/checkout/${step}`, { method: "POST", headers, body: new URLSearchParams(fields).toString() })
  return POST(request, { params: Promise.resolve({ slug, step }) })
}

function answers(response: () => Response) {
  const fetched = vi.fn(async () => response())
  vi.stubGlobal("fetch", fetched)
  return fetched
}

const locationOf = (response: Response) => new URL(response.headers.get("location") ?? "")
const callOf = (fetched: ReturnType<typeof vi.fn>) => (fetched.mock.calls[0] ?? []) as unknown as [string, RequestInit]
const who = { name: " Ana Souza ", email: " ana@exemplo.com ", phone: "(11) 97777-6666", retorno: back }

afterEach(() => vi.unstubAllGlobals())

describe("a visitor's checkout forms (P0)", () => {
  it("opens the purchase session — no code, no account — keeping it in the shopper's access cookie and none to renew it", async () => {
    const fetched = answers(() => Response.json({ purchase: PURCHASE }))

    const response = await post("identificar", who)

    const [url, init] = callOf(fetched)
    expect(url).toContain("/stores/loja/customer/checkout")
    expect(JSON.parse(String(init.body))).toEqual({ name: "Ana Souza", email: "ana@exemplo.com", phone: "(11) 97777-6666" })
    expect(response.status).toBe(303)
    const landing = locationOf(response)
    expect(`${landing.pathname}${landing.search}${landing.hash}`).toBe(back)
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "purchase-token", httpOnly: true, path: "/loja" })
    expect(response.cookies.get("bl_shopper_refresh")?.value).toBe("")
  })

  it("brings a refused form back with the e-mail and the refusal — never the name or the WhatsApp", async () => {
    answers(() => Response.json({ statusCode: 400, errorCode: "BAD_REQUEST" }, { status: 400 }))
    const invalid = locationOf(await post("identificar", who))
    expect(Object.fromEntries(invalid.searchParams)).toEqual({ cupom: "BEMVINDO10", "erro-dados": "CUSTOMER_CHECKOUT_INVALID", email: "ana@exemplo.com" })

    answers(() => new Response(null, { status: 429 }))
    expect(locationOf(await post("identificar", who)).searchParams.get("erro-dados")).toBe("RATE_LIMITED")
  })

  it("keeps the address on the session, with the visitor's token, and brings a refused one back to its form", async () => {
    const fetched = answers(() => Response.json({}))
    const address = { zipCode: "60160-230", street: "Rua Tibúrcio Cavalcante", number: "1200", complement: "", neighborhood: "Meireles", city: "Fortaleza", state: "CE", retorno: back }

    const saved = await post("endereco", address, { cookie: "bl_shopper_access=purchase-token" })
    const [url, init] = callOf(fetched)
    expect(url).toContain("/stores/loja/customer/purchase/address")
    expect(init.method).toBe("PUT")
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer purchase-token")
    expect(JSON.parse(String(init.body))).toEqual({ zipCode: "60160-230", street: "Rua Tibúrcio Cavalcante", number: "1200", complement: null, neighborhood: "Meireles", city: "Fortaleza", state: "CE" })
    expect(locationOf(saved).hash).toBe("#finalizar")

    answers(() => Response.json({ statusCode: 400, errorCode: "BAD_REQUEST" }, { status: 400 }))
    expect(locationOf(await post("endereco", address, { cookie: "bl_shopper_access=purchase-token" })).searchParams.get("erro-endereco")).toBe("CUSTOMER_ADDRESS_FIELDS_INVALID")
  })

  it("asks who is buying again when the session ended under the visitor, with nothing left of it", async () => {
    answers(() => new Response(null, { status: 401 }))
    const ended = await post("endereco", { street: "Rua X", city: "Y", retorno: back }, { cookie: "bl_shopper_access=purchase-token" })
    expect(locationOf(ended).searchParams.get("erro-dados")).toBe("CUSTOMER_PURCHASE_ENDED")
    expect(ended.cookies.get("bl_shopper_access")?.value).toBe("")

    expect(locationOf(await post("endereco", { retorno: back })).searchParams.get("erro-dados")).toBe("CUSTOMER_PURCHASE_ENDED")
  })

  it("ends the session on 'Alterar' and forgets it, back on the checkout to say who is buying again", async () => {
    const fetched = answers(() => new Response(null, { status: 204 }))

    const response = await post("sair", { retorno: back }, { cookie: "bl_shopper_access=purchase-token" })

    expect(callOf(fetched)[0]).toContain("/stores/loja/customer/purchase")
    expect(callOf(fetched)[1].method).toBe("DELETE")
    expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
    expect(locationOf(response).hash).toBe("#finalizar")
  })

  it("passes the visitor's address on to the API's limit, keeps every landing inside the shop, and answers only its own steps", async () => {
    const fetched = answers(() => Response.json({ purchase: PURCHASE }))
    await post("identificar", who)
    expect(new Headers(callOf(fetched)[1].headers).get("x-forwarded-for")).toContain("203.0.113.7")

    expect(locationOf(await post("identificar", { ...who, retorno: "https://evil.example/loja" })).pathname).toBe("/loja")
    for (const gone of ["codigo", "reenviar", "apagar"]) expect((await post(gone, who)).status).toBe(404)
    expect((await post("identificar", who, { origin: "https://evil.example" })).status).toBe(403)
  })
})
