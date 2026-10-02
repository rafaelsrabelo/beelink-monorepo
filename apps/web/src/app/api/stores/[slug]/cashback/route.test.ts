// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST as adjust } from "../customers/[customerId]/cashback/adjustments/route"
import { GET as customerCashback } from "../customers/[customerId]/cashback/route"
import { GET, PUT } from "./route"

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
const customer = { params: Promise.resolve({ slug: "loja", customerId: "c 1" }) }

afterEach(() => {
  vi.unstubAllGlobals()
  mocks.revalidateStore.mockReset()
})

describe("the shop's cashback, for the panel (BEELINK-242)", () => {
  it("reads and saves the rules at the API as the owner, the body as it came", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ settings: {}, owed: {} }))
    vi.stubGlobal("fetch", fetched)
    const rules = { enabled: true, rateBps: 500, expiresAfterDays: null, minSubtotalCents: 0, maxRedeemBps: 10000 }

    expect((await GET(request("/api/stores/loja/cashback"), shop)).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/loja\/cashback$/)
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")

    expect((await PUT(request("/api/stores/loja/cashback", { method: "PUT", body: rules }), shop)).status).toBe(200)
    expect(fetched.mock.calls[1]?.[1]?.method).toBe("PUT")
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual(rules)
    // The shop window says the shop's cashback (BEELINK-243): saved, its cache goes; read, it stays.
    expect(mocks.revalidateStore).toHaveBeenCalledOnce()
    expect(mocks.revalidateStore).toHaveBeenCalledWith("loja")
  })

  it("reads a customer's credit with its page, and posts an adjustment, the id escaped", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ balanceCents: 0 }, { status: 201 }))
    vi.stubGlobal("fetch", fetched)

    await customerCashback(request("/api/stores/loja/customers/c%201/cashback?page=2"), customer)
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/customers/c%201/cashback?page=2")

    expect((await adjust(request("/api/stores/loja/customers/c%201/cashback/adjustments", { method: "POST", body: { amountCents: -500, reason: "Lançado em dobro" } }), customer)).status).toBe(201)
    expect(String(fetched.mock.calls[1]?.[0])).toContain("/stores/loja/customers/c%201/cashback/adjustments")
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ amountCents: -500, reason: "Lançado em dobro" })
  })

  it("refuses a request from another site before asking the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await PUT(request("/api/stores/loja/cashback", { method: "PUT", body: {}, origin: "https://outro.site" }), shop)).status).toBe(403)
    expect((await adjust(request("/api/stores/loja/customers/c1/cashback/adjustments", { method: "POST", body: {}, origin: "https://outro.site" }), customer)).status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})
