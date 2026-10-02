// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

function post(fields: Record<string, string>, init: { origin?: string; cookie?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded", origin: init.origin ?? "http://localhost:3000" })
  headers.set("cookie", init.cookie ?? "bl_shopper_access=a")
  const request = new NextRequest(`http://localhost:3000/${slug}/api/customer/avisos`, { method: "POST", headers, body: new URLSearchParams(fields).toString() })
  return POST(request, { params: Promise.resolve({ slug }) })
}

const here = { retorno: "/loja/conta/perfil#avisos", entrada: "/loja/entrar" }
const locationOf = (response: Response) => new URL(response.headers.get("location") ?? "")

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shopper's notices by e-mail", () => {
  it("saves a ticked box as a yes and an unticked one as a no, and comes back to the notices, saying so", async () => {
    const fetched = vi.fn(async () => Response.json({ orders: true, favorites: false, cashback: false, offers: true, offersChosenAt: "2026-09-29T12:00:00.000Z" }))
    vi.stubGlobal("fetch", fetched)

    const landing = locationOf(await post({ ...here, offered: "cashback", orders: "1", offers: "1" }))
    const [url, init] = (fetched.mock.calls[0] ?? []) as unknown as [string, RequestInit]

    expect(url).toContain("/stores/loja/customer/me/notifications")
    expect(init.method).toBe("PUT")
    // The cashback box left unticked is a no, as the others are (BEELINK-241).
    expect(JSON.parse(String(init.body))).toEqual({ orders: true, favorites: false, cashback: false, offers: true })
    expect(landing.pathname).toBe("/loja/conta/perfil")
    expect(landing.hash).toBe("#avisos")
    expect(landing.searchParams.get("aviso")).toBe("avisos-salvos")
  })

  /** A page drawn before the cashback box existed, saved after it did: what it never showed stays as it was. */
  it("leaves the cashback choice alone when the form did not offer it", async () => {
    const fetched = vi.fn(async () => Response.json({ orders: true, favorites: true, cashback: true, offers: false, offersChosenAt: null }))
    vi.stubGlobal("fetch", fetched)

    await post({ ...here, orders: "1", favorites: "1" })
    const [, init] = (fetched.mock.calls[0] ?? []) as unknown as [string, RequestInit]

    expect(JSON.parse(String(init.body))).toEqual({ orders: true, favorites: true, offers: false })
  })

  it("says a refusal on the notices, and sends a session that ended to the sign-in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "RATE_LIMITED" }, { status: 429 })))
    expect(locationOf(await post(here)).searchParams.get("erro-avisos")).toBe("RATE_LIMITED")

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "AUTH_UNAUTHENTICATED" }, { status: 401 })))
    const signedOut = locationOf(await post(here, { cookie: "bl_shopper_access=old" }))
    expect(signedOut.pathname).toBe("/loja/entrar")
    expect(signedOut.searchParams.get("voltar")).toBe("/loja/conta/perfil#avisos")
    expect(signedOut.searchParams.get("erro")).toBe("CUSTOMER_SESSION_ENDED")
  })

  it("saves nothing from a body that is not a form", async () => {
    const fetched = vi.fn(async () => Response.json({}))
    vi.stubGlobal("fetch", fetched)
    const request = new NextRequest("http://localhost:3000/loja/api/customer/avisos", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: "bl_shopper_access=a" },
      body: JSON.stringify({ orders: false }),
    })

    const landing = locationOf(await POST(request, { params: Promise.resolve({ slug: "loja" }) }))

    expect(fetched).not.toHaveBeenCalled()
    expect(landing.searchParams.get("erro-avisos")).toBe("UNKNOWN")
  })

  it("behind the proxy, lands on the site the shopper is on, never the server's bind address", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})))
    const request = new NextRequest("https://0.0.0.0:3000/loja/api/customer/avisos", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://link.beecoders.net", "x-forwarded-host": "link.beecoders.net", cookie: "bl_shopper_access=a" },
      body: new URLSearchParams({ ...here, orders: "1" }).toString(),
    })

    const landing = locationOf(await POST(request, { params: Promise.resolve({ slug: "loja" }) }))

    expect(landing.origin).toBe("https://link.beecoders.net")
    expect(landing.searchParams.get("aviso")).toBe("avisos-salvos")
  })

  it("answers only this shop's own form", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})))

    expect((await post(here, { origin: "https://evil.example" })).status).toBe(403)
    expect(locationOf(await post({ ...here, retorno: "https://evil.example/x" })).origin).toBe("http://localhost:3000")
  })
})
