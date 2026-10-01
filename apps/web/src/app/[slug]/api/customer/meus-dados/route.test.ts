// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

function get(query = "retorno=%2Floja%2Fconta%2Fperfil%23privacidade&entrada=%2Floja%2Fentrar", cookie = "bl_shopper_access=a", slug = "loja") {
  const request = new NextRequest(`http://localhost:3000/${slug}/api/customer/meus-dados?${query}`, { headers: { cookie } })
  return GET(request, { params: Promise.resolve({ slug }) })
}

const locationOf = (response: Response) => new URL(response.headers.get("location") ?? "")

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("the shopper's copy of their data", () => {
  it("answers with the file, named for the shop and the day, never cached", async () => {
    vi.useFakeTimers({ now: new Date("2026-09-30T23:30:00-03:00"), toFake: ["Date"] })
    const fetched = vi.fn(async () => Response.json({ shop: { slug: "loja" }, orders: [] }))
    vi.stubGlobal("fetch", fetched)

    const response = await get()

    expect(String((fetched.mock.calls[0] as unknown[])[0])).toContain("/stores/loja/customer/me/data")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="meus-dados-loja-2026-09-30.json"')
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(await response.json()).toEqual({ shop: { slug: "loja" }, orders: [] })
  })

  it("sends a session that ended to the sign-in, on its way back to the section", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "AUTH_UNAUTHENTICATED" }, { status: 401 })))

    const response = await get(undefined, "bl_shopper_access=old")
    const landing = locationOf(response)

    expect(response.status).toBe(303)
    expect(landing.pathname).toBe("/loja/entrar")
    expect(landing.searchParams.get("voltar")).toBe("/loja/conta/perfil#privacidade")
  })

  it("comes back to the section, saying so, when the copy could not be made", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })))

    const landing = locationOf(await get())

    expect(landing.pathname).toBe("/loja/conta/perfil")
    expect(landing.hash).toBe("#privacidade")
    expect(landing.searchParams.get("erro-dados")).toBe("UNKNOWN")
    expect(landing.searchParams.get("erro-privacidade")).toBeNull()

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "RATE_LIMITED" }, { status: 429 })))
    expect(locationOf(await get()).searchParams.get("erro-dados")).toBe("RATE_LIMITED")
  })

  it("refuses a slug that is not one, and keeps every way back inside the shop", async () => {
    const fetched = vi.fn(async () => new Response("down", { status: 503 }))
    vi.stubGlobal("fetch", fetched)

    expect((await get(undefined, undefined, "Loja Grande")).status).toBe(404)
    expect(locationOf(await get("retorno=https%3A%2F%2Fevil.example")).pathname).toBe("/loja")
  })
})
