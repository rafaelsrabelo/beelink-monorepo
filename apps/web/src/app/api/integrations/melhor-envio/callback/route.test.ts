// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET as connect } from "../../../stores/[slug]/integrations/melhor-envio/connect/route"
import { DELETE, GET as connection } from "../../../stores/[slug]/integrations/melhor-envio/route"
import { GET as callback } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(path: string, init: { method?: string; json?: boolean; origin?: string | null; cookie?: string } = {}) {
  const headers = new Headers({ cookie: init.cookie ?? "bl_access=owner-access" })
  if (init.json !== false) headers.set("content-type", "application/json")
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  return new NextRequest(`http://localhost:3000${path}`, { method: init.method ?? "GET", headers })
}

const shop = { params: Promise.resolve({ slug: "lessari" }) }
const stub = (answer: () => Response) => {
  const fetched = vi.fn<Fetched>(async () => answer())
  vi.stubGlobal("fetch", fetched)
  return fetched
}

afterEach(() => vi.unstubAllGlobals())

describe("the shop's Melhor Envio connection, for the panel (BEELINK-182)", () => {
  it("reads the connection and disconnects it at the API as the owner, a delete answering 200", async () => {
    const fetched = stub(() => Response.json({ status: "CONNECTED" }))

    expect((await connection(request("/api/stores/lessari/integrations/melhor-envio"), shop)).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/lessari\/integrations\/melhor-envio$/)
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")

    fetched.mockResolvedValueOnce(new Response(null, { status: 204 }))
    const gone = await DELETE(request("/api/stores/lessari/integrations/melhor-envio", { method: "DELETE" }), shop)
    expect(gone.status).toBe(200)
    expect(fetched.mock.calls[1]?.[1]?.method).toBe("DELETE")
  })

  it("sends the browser to Melhor Envio's page, remembering the shop for the way back — on the callback's path only", async () => {
    const fetched = stub(() => Response.json({ url: "https://sandbox.melhorenvio.com.br/oauth/authorize?state=s1" }))

    // A link followed: no JSON header, and a top-level navigation may carry no origin at all.
    const answer = await connect(request("/api/stores/lessari/integrations/melhor-envio/connect", { json: false, origin: null }), shop)

    expect(answer.status).toBe(303)
    expect(answer.headers.get("location")).toBe("https://sandbox.melhorenvio.com.br/oauth/authorize?state=s1")
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/lessari\/integrations\/melhor-envio\/authorize$/)
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("POST")
    const remembered = answer.cookies.get("bl_integration_return")
    expect(remembered).toMatchObject({ value: "lessari", path: "/api/integrations", httpOnly: true })
  })

  it("does not start from another site, sends a signed-out owner to the sign-in, and says why it could not start", async () => {
    stub(() => Response.json({ url: "https://x" }))
    expect((await connect(request("/api/stores/lessari/integrations/melhor-envio/connect", { origin: "https://evil.test" }), shop)).status).toBe(403)

    const signedOut = await connect(request("/api/stores/lessari/integrations/melhor-envio/connect", { cookie: "" }), shop)
    expect(signedOut.headers.get("location")).toBe("http://localhost:3000/login?voltar=%2Fadmin%2Flessari%2Fintegrations")

    stub(() => Response.json({ statusCode: 503, errorCode: "INTEGRATION_UNAVAILABLE", message: "x" }, { status: 503 }))
    const unavailable = await connect(request("/api/stores/lessari/integrations/melhor-envio/connect"), shop)
    expect(unavailable.headers.get("location")).toBe("http://localhost:3000/admin/lessari/integrations?erro=INTEGRATION_UNAVAILABLE")
  })
})

describe("Melhor Envio's way back (BEELINK-182)", () => {
  const back = (query: string, cookie = "bl_access=owner-access; bl_integration_return=lessari") => callback(request(`/api/integrations/melhor-envio/callback${query}`, { json: false, origin: null, cookie }))

  it("hands the code and the state to the API as the owner, and lands on the shop's integrations page", async () => {
    const fetched = stub(() => Response.json({ storeSlug: "lessari", connection: { status: "CONNECTED" } }))

    const answer = await back("?code=c1&state=s1")

    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/integrations\/melhor-envio\/callback$/)
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual({ code: "c1", state: "s1" })
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
    expect(answer.status).toBe(303)
    expect(answer.headers.get("location")).toBe("http://localhost:3000/admin/lessari/integrations?conectado=melhor-envio")
    expect(answer.cookies.get("bl_integration_return")?.value).toBe("")
  })

  it("says what the API refused with, on the page of the shop the API named", async () => {
    stub(() => Response.json({ statusCode: 400, errorCode: "INTEGRATION_EXCHANGE_FAILED", message: "x", details: { storeSlug: "lessari" } }, { status: 400 }))

    const answer = await back("?code=c1&state=s1", "bl_access=owner-access")

    expect(answer.headers.get("location")).toBe("http://localhost:3000/admin/lessari/integrations?erro=INTEGRATION_EXCHANGE_FAILED")
  })

  it("says the shopkeeper cancelled, asking the API nothing; and with no shop to go back to, lands on the panel", async () => {
    const fetched = stub(() => Response.json({}))

    expect((await back("?error=access_denied&state=s1")).headers.get("location")).toBe("http://localhost:3000/admin/lessari/integrations?erro=INTEGRATION_CANCELLED")
    expect(fetched).not.toHaveBeenCalled()

    stub(() => Response.json({ statusCode: 400, errorCode: "INTEGRATION_STATE_INVALID", message: "x" }, { status: 400 }))
    // A cookie that is not a slug is no way home.
    expect((await back("?code=c1&state=s1", "bl_access=owner-access; bl_integration_return=..%2Foutra")).headers.get("location")).toBe("http://localhost:3000/admin")
  })
})
