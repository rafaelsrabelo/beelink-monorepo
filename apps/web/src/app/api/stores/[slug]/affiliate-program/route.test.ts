// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { DELETE as removeRate, PUT as setRate } from "./tables/[tableId]/rates/[productId]/route"
import { DELETE as removeTable, GET as readTable, PUT as updateTable } from "./tables/[tableId]/route"
import { POST as createTable } from "./tables/route"
import { GET, PUT } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function request(path: string, init: { method?: string; body?: object; origin?: string } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", cookie: "bl_access=owner-access" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })
}

const shop = { params: Promise.resolve({ slug: "loja" }) }
const table = { params: Promise.resolve({ slug: "loja", tableId: "t 1" }) }
const rate = { params: Promise.resolve({ slug: "loja", tableId: "t 1", productId: "p/1" }) }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shop's affiliate programme, for the panel (IMPULSEIA-102)", () => {
  it("reads and saves the rules at the API as the owner, the body as it came", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ program: {}, tables: [], periods: [] }))
    vi.stubGlobal("fetch", fetched)
    const rules = { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null }

    expect((await GET(request("/api/stores/loja/affiliate-program"), shop)).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/loja\/affiliate-program$/)
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")

    expect((await PUT(request("/api/stores/loja/affiliate-program", { method: "PUT", body: rules }), shop)).status).toBe(200)
    expect(fetched.mock.calls[1]?.[1]?.method).toBe("PUT")
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual(rules)
  })

  it("creates, reads, changes and deletes a table, the id escaped, and answers the delete with no body", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ id: "t 1" }, { status: init?.method === "POST" ? 201 : 200 })))
    vi.stubGlobal("fetch", fetched)
    const body = { name: "Influencers", defaultRateBps: 1500 }

    expect((await createTable(request("/api/stores/loja/affiliate-program/tables", { method: "POST", body }), shop)).status).toBe(201)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/loja\/affiliate-program\/tables$/)
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual(body)

    await readTable(request("/api/stores/loja/affiliate-program/tables/t%201"), table)
    expect(String(fetched.mock.calls[1]?.[0])).toContain("/stores/loja/affiliate-program/tables/t%201")
    expect((await updateTable(request("/api/stores/loja/affiliate-program/tables/t%201", { method: "PUT", body }), table)).status).toBe(200)
    expect(fetched.mock.calls[2]?.[1]?.method).toBe("PUT")

    const removed = await removeTable(request("/api/stores/loja/affiliate-program/tables/t%201", { method: "DELETE" }), table)
    expect(removed.status).toBe(204)
    expect(await removed.text()).toBe("")
  })

  it("sets and drops a product's rate on a table, both ids escaped", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ productId: "p/1", rateBps: 0 })))
    vi.stubGlobal("fetch", fetched)

    expect((await setRate(request("/api/stores/loja/affiliate-program/tables/t%201/rates/p%2F1", { method: "PUT", body: { rateBps: 0 } }), rate)).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/affiliate-program/tables/t%201/rates/p%2F1")
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual({ rateBps: 0 })
    expect((await removeRate(request("/api/stores/loja/affiliate-program/tables/t%201/rates/p%2F1", { method: "DELETE" }), rate)).status).toBe(204)
  })

  it("refuses a request from another origin before reaching the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await PUT(request("/api/stores/loja/affiliate-program", { method: "PUT", body: {}, origin: "https://evil.example" }), shop)).status).toBe(403)
    expect((await removeTable(request("/api/stores/loja/affiliate-program/tables/t%201", { method: "DELETE", origin: "https://evil.example" }), table)).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})
