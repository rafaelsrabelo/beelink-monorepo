// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const PRODUCT = "01a0d395-c1ab-7399-a472-000000000001"

function post(fields: Record<string, string>, init: { origin?: string; cookie?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded", origin: init.origin ?? "http://localhost:3000" })
  headers.set("cookie", init.cookie ?? "bl_shopper_access=a")
  const request = new NextRequest(`http://localhost:3000/${slug}/api/customer/favoritos`, { method: "POST", headers, body: new URLSearchParams(fields).toString() })
  return POST(request, { params: Promise.resolve({ slug }) })
}

const here = { produto: PRODUCT, retorno: "/loja/conta/favoritos?filtro=baixou", entrada: "/loja/entrar" }
const locationOf = (response: Response) => new URL(response.headers.get("location") ?? "")

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("removing a favourite from the tab", () => {
  it("unlikes it at the API and comes back to the tab, as it was filtered, saying so", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post(here)
    const [url, init] = (fetched.mock.calls[0] ?? []) as unknown as [string, RequestInit]

    expect(response.status).toBe(303)
    expect(url).toContain(`/stores/loja/customer/favorites/${PRODUCT}`)
    expect(init.method).toBe("DELETE")
    const landing = locationOf(response)
    expect(landing.pathname).toBe("/loja/conta/favoritos")
    expect(landing.searchParams.get("filtro")).toBe("baixou")
    expect(landing.searchParams.get("aviso")).toBe("favorito-removido")
  })

  it("says a refusal, and sends a session that ended to the sign-in, back to the tab", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "RATE_LIMITED" }, { status: 429 })))
    expect(locationOf(await post(here)).searchParams.get("erro-favoritos")).toBe("RATE_LIMITED")

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "AUTH_UNAUTHENTICATED" }, { status: 401 })))
    const signedOut = locationOf(await post(here, { cookie: "bl_shopper_access=old" }))
    expect(signedOut.pathname).toBe("/loja/entrar")
    expect(signedOut.searchParams.get("voltar")).toBe("/loja/conta/favoritos?filtro=baixou")
    expect(signedOut.searchParams.get("erro")).toBe("CUSTOMER_SESSION_ENDED")
  })

  it("asks nothing for a product that is not an id, and never leaves the shop", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    const landing = locationOf(await post({ ...here, produto: "../orders", retorno: "https://outro.site/roubo" }))

    expect(fetched).not.toHaveBeenCalled()
    expect(landing.origin).toBe("http://localhost:3000")
    expect(landing.pathname.startsWith("/loja")).toBe(true)
    expect(landing.searchParams.get("erro-favoritos")).toBe("UNKNOWN")
  })

  it("answers only this shop's own form", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await post(here, { origin: "https://outro.site" })).status).toBe(403)
    expect((await post(here, {}, "Loja Nova")).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })
})
