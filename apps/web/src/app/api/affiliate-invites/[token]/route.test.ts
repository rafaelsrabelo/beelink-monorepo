// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST as signUp } from "../../session/affiliate-invite/[token]/route"
import { POST as accept } from "./accept/route"
import { GET as read } from "./route"
import { GET as slug } from "./slug/route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(path: string, init: { method?: string; body?: object; origin?: string; cookie?: string } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", "x-forwarded-for": "203.0.113.7", ...(init.cookie ? { cookie: init.cookie } : {}) },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const invite = { params: Promise.resolve({ token: "tok/1" }) }
const session = { accessToken: "access", refreshToken: "refresh", accessTokenExpiresAt: "2099-01-01T00:00:00.000Z", user: { id: "u1" } }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the invite, for the person invited (IMPULSEIA-104)", () => {
  it("reads the invite and checks a /name with no session, the token escaped and the visitor's address forwarded", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ ok: true }))
    vi.stubGlobal("fetch", fetched)

    expect((await read(request("/api/affiliate-invites/tok%2F1"), invite)).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/affiliate-invites\/tok%2F1$/)
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("GET")
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("x-forwarded-for")).toBe("203.0.113.7")

    await slug(request("/api/affiliate-invites/tok%2F1/slug?slug=jo%C3%A3o%20s"), invite)
    expect(String(fetched.mock.calls[1]?.[0])).toMatch(/\/affiliate-invites\/tok%2F1\/slug\?slug=jo%C3%A3o%20s$/)
  })

  it("answers the API's refusal as it came — a 410 for an invite expired", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 410, errorCode: "AFFILIATE_INVITE_EXPIRED", message: "Expired" }, { status: 410 })))

    const answer = await read(request("/api/affiliate-invites/tok%2F1"), invite)
    expect(answer.status).toBe(410)
    expect(await answer.json()).toMatchObject({ errorCode: "AFFILIATE_INVITE_EXPIRED" })
  })

  it("accepts as the signed-in account, the body as it came", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ storeName: "Loja", storeSlug: "loja", slug: "joao" }))
    vi.stubGlobal("fetch", fetched)
    const body = { slug: "joao", pixKey: null, termsVersion: 1 }

    expect((await accept(request("/api/affiliate-invites/tok%2F1/accept", { method: "POST", body, cookie: "bl_access=mine" }), invite)).status).toBe(200)
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer mine")
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual(body)
  })

  it("signs up and in: the cookies written, the tokens kept from the page, the shop and the /name answered", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ session, affiliate: { storeName: "Loja", storeSlug: "loja", slug: "joao" } }, { status: 201 })))

    const answer = await signUp(request("/api/session/affiliate-invite/tok%2F1", { method: "POST", body: { name: "João", password: "12345678", slug: "joao", pixKey: null, termsVersion: 1 } }), invite)
    expect(answer.status).toBe(201)
    const payload = await answer.text()
    expect(JSON.parse(payload)).toEqual({ storeName: "Loja", storeSlug: "loja", slug: "joao" })
    expect(payload).not.toContain("access")
    expect(answer.cookies.get("bl_access")?.value).toBe("access")
    expect(answer.cookies.get("bl_refresh")?.value).toBe("refresh")
  })

  it("writes no cookie when the API refuses the sign-up", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 409, errorCode: "AUTH_EMAIL_TAKEN", message: "Taken" }, { status: 409 })))

    const answer = await signUp(request("/api/session/affiliate-invite/tok%2F1", { method: "POST", body: {} }), invite)
    expect(answer.status).toBe(409)
    expect(answer.cookies.get("bl_access")).toBeUndefined()
  })

  it("refuses another origin before reaching the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await signUp(request("/api/session/affiliate-invite/tok%2F1", { method: "POST", body: {}, origin: "https://evil.example" }), invite)).status).toBe(403)
    expect((await accept(request("/api/affiliate-invites/tok%2F1/accept", { method: "POST", body: {}, origin: "https://evil.example" }), invite)).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})
