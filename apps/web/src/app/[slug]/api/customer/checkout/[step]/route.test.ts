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
  user: { id: "1", name: "Bia", email: "bia@exemplo.com", emailVerified: false, createdAt: "" },
}

const back = "/loja/carrinho?cupom=BEMVINDO10#finalizar"

function post(step: string, fields: Record<string, string>, init: { origin?: string | null } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": "203.0.113.7" })
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
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
const who = { name: " Bia Cliente ", email: " bia@exemplo.com ", phone: "(11) 98765-4321", retorno: back }

afterEach(() => vi.unstubAllGlobals())

describe("the checkout's who-is-buying forms", () => {
  it("signs a new customer in at once, keeping the pair in httpOnly cookies, and lands back on the checkout with the coupon", async () => {
    const fetched = answers(() => Response.json({ kind: "SESSION", session: SESSION }))

    const response = await post("identificar", who)

    const [url, init] = callOf(fetched)
    expect(url).toContain("/stores/loja/customer/checkout")
    expect(JSON.parse(String(init.body))).toEqual({ name: "Bia Cliente", email: "bia@exemplo.com", phone: "(11) 98765-4321" })
    expect(response.status).toBe(303)
    const landing = locationOf(response)
    expect(`${landing.pathname}${landing.search}${landing.hash}`).toBe(back)
    expect(response.cookies.get("bl_shopper_access")).toMatchObject({ value: "shopper-access", httpOnly: true, path: "/loja" })
    expect(response.cookies.get("bl_shopper_refresh")).toMatchObject({ value: "shopper-refresh", httpOnly: true })
  })

  it("asks an e-mail with an account here for its code, carrying the e-mail alone — never the name or the WhatsApp", async () => {
    answers(() => Response.json({ kind: "CODE_SENT" }))

    const landing = locationOf(await post("identificar", who))

    expect(landing.pathname).toBe("/loja/carrinho")
    expect(landing.hash).toBe("#finalizar")
    expect(landing.searchParams.get("codigo")).toBe("1")
    expect(landing.searchParams.get("email")).toBe("bia@exemplo.com")
    expect(landing.searchParams.get("cupom")).toBe("BEMVINDO10")
    expect([...landing.searchParams.keys()].sort()).toEqual(["codigo", "cupom", "email"])
  })

  it("brings a refused form back with the e-mail and the refusal: the whole form for a 400, the API's word otherwise", async () => {
    answers(() => Response.json({ statusCode: 400, errorCode: "BAD_REQUEST" }, { status: 400 }))
    const invalid = locationOf(await post("identificar", who))
    expect(invalid.searchParams.get("erro-dados")).toBe("CUSTOMER_CHECKOUT_INVALID")
    expect(invalid.searchParams.get("email")).toBe("bia@exemplo.com")
    expect(invalid.searchParams.has("codigo")).toBe(false)

    answers(() => new Response(null, { status: 429 }))
    expect(locationOf(await post("identificar", who)).searchParams.get("erro-dados")).toBe("RATE_LIMITED")

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")))
    expect(locationOf(await post("identificar", who)).searchParams.get("erro-dados")).toBe("UNKNOWN")
  })

  it("trades the code for the session, and a wrong one comes back to the code step saying so", async () => {
    const fetched = answers(() => Response.json(SESSION))
    const signedIn = await post("codigo", { email: "bia@exemplo.com", code: "123 456", retorno: back })
    expect(JSON.parse(String(callOf(fetched)[1].body))).toEqual({ email: "bia@exemplo.com", code: "123 456" })
    expect(callOf(fetched)[0]).toContain("/stores/loja/customer/checkout/code")
    expect(signedIn.cookies.get("bl_shopper_access")).toMatchObject({ value: "shopper-access" })
    expect(locationOf(signedIn).searchParams.has("codigo")).toBe(false)

    answers(() => Response.json({ statusCode: 400, errorCode: "CUSTOMER_CODE_INVALID" }, { status: 400 }))
    const wrong = await post("codigo", { email: "bia@exemplo.com", code: "000000", retorno: back })
    expect(wrong.cookies.get("bl_shopper_access")).toBeUndefined()
    expect(Object.fromEntries(locationOf(wrong).searchParams)).toMatchObject({ codigo: "1", email: "bia@exemplo.com", "erro-dados": "CUSTOMER_CODE_INVALID" })
  })

  it("asks for another code and says it went", async () => {
    const fetched = answers(() => new Response(null, { status: 202 }))

    const landing = locationOf(await post("reenviar", { email: "bia@exemplo.com", retorno: back }))

    expect(callOf(fetched)[0]).toContain("/stores/loja/customer/checkout/code/resend")
    expect(Object.fromEntries(landing.searchParams)).toMatchObject({ codigo: "1", email: "bia@exemplo.com", reenviado: "1" })
  })

  it("passes the visitor's address on to the API's limit, which guards the door that opens accounts", async () => {
    const fetched = answers(() => Response.json({ kind: "CODE_SENT" }))

    await post("identificar", who)

    expect(new Headers(callOf(fetched)[1].headers).get("x-forwarded-for")).toContain("203.0.113.7")
  })

  it("keeps every landing inside the shop, answers only its own steps and refuses another site's form", async () => {
    answers(() => Response.json({ kind: "CODE_SENT" }))
    expect(locationOf(await post("identificar", { ...who, retorno: "https://evil.example/loja" })).pathname).toBe("/loja")

    expect((await post("apagar", who)).status).toBe(404)
    expect((await post("identificar", who, {}, "..%2Fevil")).status).toBe(404)
    expect((await post("identificar", who, { origin: "https://evil.example" })).status).toBe(403)
  })
})
