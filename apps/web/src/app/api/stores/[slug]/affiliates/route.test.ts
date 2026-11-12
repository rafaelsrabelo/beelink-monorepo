// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST as act } from "./[affiliateId]/[action]/route"
import { DELETE, GET as read, PATCH } from "./[affiliateId]/route"
import { GET as list, POST as invite } from "./route"

const mocks = vi.hoisted(() => ({ revalidateStore: vi.fn() }))
vi.mock("@/lib/revalidate", () => ({ revalidateStore: mocks.revalidateStore }))

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(path: string, init: { method?: string; body?: object; origin?: string } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", cookie: "bl_access=owner-access" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const shop = { params: Promise.resolve({ slug: "loja" }) }
const one = { params: Promise.resolve({ slug: "loja", affiliateId: "a 1" }) }
const acting = (action: string) => ({ params: Promise.resolve({ slug: "loja", affiliateId: "a 1", action }) })

afterEach(() => {
  vi.unstubAllGlobals()
  mocks.revalidateStore.mockReset()
})

describe("the shop's affiliates, for the panel (IMPULSEIA-104)", () => {
  it("lists with the standing and the page, and nothing else the address carried", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ affiliates: [], total: 0, page: 2, pageSize: 20 }))
    vi.stubGlobal("fetch", fetched)

    expect((await list(request("/api/stores/loja/affiliates?status=ACTIVE&page=2&evil=1"), shop)).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/loja\/affiliates\?status=ACTIVE&page=2$/)
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")

    await list(request("/api/stores/loja/affiliates"), shop)
    expect(String(fetched.mock.calls[1]?.[0])).toMatch(/\/stores\/loja\/affiliates$/)
  })

  it("invites, reads, changes and cancels one, the id escaped, the cancel answered with no body", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ id: "a 1" }, { status: init?.method === "POST" ? 201 : 200 })))
    vi.stubGlobal("fetch", fetched)
    const body = { name: "Maria", email: "maria@exemplo.com", tableId: "t1" }

    expect((await invite(request("/api/stores/loja/affiliates", { method: "POST", body }), shop)).status).toBe(201)
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual(body)
    await read(request("/api/stores/loja/affiliates/a%201"), one)
    expect(String(fetched.mock.calls[1]?.[0])).toContain("/stores/loja/affiliates/a%201")
    expect((await PATCH(request("/api/stores/loja/affiliates/a%201", { method: "PATCH", body: { note: null } }), one)).status).toBe(200)
    expect(fetched.mock.calls[2]?.[1]?.method).toBe("PATCH")

    const cancelled = await DELETE(request("/api/stores/loja/affiliates/a%201", { method: "DELETE" }), one)
    expect(cancelled.status).toBe(204)
    expect(await cancelled.text()).toBe("")
  })

  it.each(["resend", "pause", "resume", "end"])("takes %s to the API", async (action) => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ id: "a 1" }))
    vi.stubGlobal("fetch", fetched)

    expect((await act(request(`/api/stores/loja/affiliates/a%201/${action}`, { method: "POST" }), acting(action))).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(new RegExp(`/stores/loja/affiliates/a%201/${action}$`))
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("POST")
    // Pausing, resuming and ending change whether the shop window's link credits (IMPULSEIA-105); a resend does not.
    expect(mocks.revalidateStore.mock.calls).toEqual(action === "resend" ? [] : [["loja"]])
  })

  it("answers a word that is no act, and another origin, before reaching the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await act(request("/api/stores/loja/affiliates/a%201/delete", { method: "POST" }), acting("delete"))).status).toBe(404)
    expect((await invite(request("/api/stores/loja/affiliates", { method: "POST", body: {}, origin: "https://evil.example" }), shop)).status).toBe(403)
    expect((await DELETE(request("/api/stores/loja/affiliates/a%201", { method: "DELETE", origin: "https://evil.example" }), one)).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})
