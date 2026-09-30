// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const PRODUCT = "01a0d395-c1ab-7399-a472-000000000001"
const REVIEW = "01a0d395-c1ab-7399-a472-0000000000aa"

function post(fields: Record<string, string>, init: { origin?: string; cookie?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded", origin: init.origin ?? "http://localhost:3000" })
  headers.set("cookie", init.cookie ?? "bl_shopper_access=a")
  const request = new NextRequest(`http://localhost:3000/${slug}/api/customer/avaliacoes`, { method: "POST", headers, body: new URLSearchParams(fields).toString() })
  return POST(request, { params: Promise.resolve({ slug }) })
}

const here = { produto: PRODUCT, retorno: "/loja/conta/avaliacoes", entrada: "/loja/entrar" }
const locationOf = (response: Response) => new URL(response.headers.get("location") ?? "")
type Fetched = (url: string, init?: RequestInit) => Promise<Response>

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("a review from Avaliar compras", () => {
  it("sends a new one at the API, and comes back to the product's place, saying so", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ id: REVIEW }, { status: 201 }))
    vi.stubGlobal("fetch", fetched)

    const landing = locationOf(await post({ ...here, acao: "criar", nota: "4", comentario: "  Muito bom  " }))
    const [url, init] = fetched.mock.calls[0] ?? []

    expect(url).toContain("/stores/loja/customer/reviews")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual({ productId: PRODUCT, rating: 4, comment: "Muito bom" })
    expect(landing.pathname).toBe("/loja/conta/avaliacoes")
    expect(landing.searchParams.get("aviso")).toBe("avaliacao-enviada")
    expect(landing.hash).toBe(`#avaliar-${PRODUCT}`)
  })

  it("edits one with a PUT, an emptied box removing the comment", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ id: REVIEW }))
    vi.stubGlobal("fetch", fetched)

    const landing = locationOf(await post({ ...here, acao: "editar", avaliacao: REVIEW, nota: "2", comentario: "   " }))
    const [url, init] = fetched.mock.calls[0] ?? []

    expect(url).toContain(`/stores/loja/customer/reviews/${REVIEW}`)
    expect(init?.method).toBe("PUT")
    expect(JSON.parse(String(init?.body))).toEqual({ rating: 2, comment: null })
    expect(landing.searchParams.get("aviso")).toBe("avaliacao-salva")
  })

  it("says a refusal, and sends a session that ended to the sign-in, back to the tab", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ errorCode: "CUSTOMER_REVIEW_EXISTS" }, { status: 409 })))
    expect(locationOf(await post({ ...here, acao: "criar", nota: "5" })).searchParams.get("erro-avaliacoes")).toBe("CUSTOMER_REVIEW_EXISTS")

    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ errorCode: "AUTH_UNAUTHENTICATED" }, { status: 401 })))
    const signedOut = locationOf(await post({ ...here, acao: "criar", nota: "5" }, { cookie: "bl_shopper_access=old" }))
    expect(signedOut.pathname).toBe("/loja/entrar")
    expect(signedOut.searchParams.get("voltar")).toBe("/loja/conta/avaliacoes")
    expect(signedOut.searchParams.get("erro")).toBe("CUSTOMER_SESSION_ENDED")
  })

  it("asks nothing for a rating the stars cannot send, or a product that is not an id", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect(locationOf(await post({ ...here, acao: "criar", nota: "6" })).searchParams.get("erro-avaliacoes")).toBe("BAD_REQUEST")
    expect(locationOf(await post({ ...here, acao: "criar" })).searchParams.get("erro-avaliacoes")).toBe("BAD_REQUEST")
    expect(locationOf(await post({ ...here, produto: "../orders", acao: "criar", nota: "5" })).searchParams.get("erro-avaliacoes")).toBe("UNKNOWN")
    expect(fetched).not.toHaveBeenCalled()
  })

  it("answers only this shop's own form, and never leaves the shop", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await post({ ...here, acao: "criar", nota: "5" }, { origin: "https://outro.site" })).status).toBe(403)
    expect(locationOf(await post({ ...here, acao: "criar", nota: "0", retorno: "https://outro.site" })).origin).toBe("http://localhost:3000")
    expect(fetched).not.toHaveBeenCalled()
  })
})
