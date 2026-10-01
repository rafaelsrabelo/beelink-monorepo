// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

function post(fields: Record<string, string>, init: { origin?: string; cookie?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded", origin: init.origin ?? "http://localhost:3000" })
  headers.set("cookie", init.cookie ?? "bl_shopper_access=a")
  const request = new NextRequest(`http://localhost:3000/${slug}/api/customer/excluir-conta`, { method: "POST", headers, body: new URLSearchParams(fields).toString() })
  return POST(request, { params: Promise.resolve({ slug }) })
}

const here = { retorno: "/loja/conta/perfil#privacidade", entrada: "/loja/entrar" }
const locationOf = (response: Response) => new URL(response.headers.get("location") ?? "")
const callOf = (fetched: ReturnType<typeof vi.fn>) => (fetched.mock.calls[0] as unknown[]) as [string, RequestInit]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("deleting the shopper's account", () => {
  it("sends the password, and lands on the shop's sign-in, told so, its cookies gone", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ ...here, username: "bia@exemplo.com", password: "a-senha-dela" })
    const [url, init] = callOf(fetched)

    expect(url).toContain("/stores/loja/customer/me")
    expect(init.method).toBe("DELETE")
    expect(JSON.parse(String(init.body))).toEqual({ password: "a-senha-dela" })
    const landing = locationOf(response)
    expect(response.status).toBe(303)
    expect(landing.pathname).toBe("/loja/entrar")
    expect(landing.searchParams.get("conta-excluida")).toBe("1")
    expect(response.cookies.get("bl_shopper_access")?.value).toBe("")
    expect(response.cookies.get("bl_shopper_refresh")?.value).toBe("")
  })

  it("sends the e-mail of an account with no password, and nothing else", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    await post({ ...here, email: "bia@exemplo.com" })

    expect(JSON.parse(String(callOf(fetched)[1].body))).toEqual({ email: "bia@exemplo.com" })
  })

  it("brings a refusal back to the section with its code, the session kept", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "AUTH_PASSWORD_WRONG" }, { status: 403 })))

    const response = await post({ ...here, password: "nao-e-essa" })
    const landing = locationOf(response)

    expect(landing.pathname).toBe("/loja/conta/perfil")
    expect(landing.hash).toBe("#privacidade")
    expect(landing.searchParams.get("erro-privacidade")).toBe("AUTH_PASSWORD_WRONG")
    expect(response.cookies.get("bl_shopper_access")).toBeUndefined()

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down") }))
    expect(locationOf(await post({ ...here, password: "x" })).searchParams.get("erro-privacidade")).toBe("UNKNOWN")
  })

  it("sends a session that ended to the sign-in, deleting nothing, on its way back to the section", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errorCode: "AUTH_UNAUTHENTICATED" }, { status: 401 })))

    const landing = locationOf(await post({ ...here, password: "a-senha-dela" }, { cookie: "bl_shopper_access=old" }))

    expect(landing.pathname).toBe("/loja/entrar")
    expect(landing.searchParams.get("erro")).toBe("CUSTOMER_SESSION_ENDED")
    expect(landing.searchParams.get("conta-excluida")).toBeNull()
  })

  it("refuses a post from another site and a slug that is not one, calling nothing", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    expect((await post({ ...here, password: "x" }, { origin: "https://evil.example" })).status).toBe(403)
    expect((await post({ ...here, password: "x" }, {}, "Loja Grande")).status).toBe(404)
    expect(fetched).not.toHaveBeenCalled()
  })

  it("never sends the shopper outside the shop", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })))

    expect(locationOf(await post({ retorno: "https://evil.example", entrada: "//evil.example", password: "x" })).pathname).toBe("/loja")
  })
})
