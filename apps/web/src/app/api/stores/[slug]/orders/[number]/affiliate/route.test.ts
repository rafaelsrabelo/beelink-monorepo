// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET as owed } from "../../../affiliate-program/owed/route"
import { POST as adjust } from "../../../affiliates/[affiliateId]/adjustments/route"
import { POST as pay } from "../../../affiliates/[affiliateId]/payouts/route"
import { DELETE as removePhoto } from "../../../affiliates/[affiliateId]/photo/route"
import { GET as statement } from "../../../affiliates/[affiliateId]/statement/route"
import { DELETE as removeTagline } from "../../../affiliates/[affiliateId]/tagline/route"
import { GET as read, PUT as change } from "./route"

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

const order = { params: Promise.resolve({ slug: "loja", number: "12" }) }
const one = { params: Promise.resolve({ slug: "loja", affiliateId: "a 1" }) }
const shop = { params: Promise.resolve({ slug: "loja" }) }

afterEach(() => {
  vi.unstubAllGlobals()
  mocks.revalidateStore.mockReset()
})

describe("the shop's money with its affiliates, for the panel (IMPULSEIA-107)", () => {
  it("reads and changes an order's affiliate, the body whole and the shop window untouched", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ affiliate: null }))
    vi.stubGlobal("fetch", fetched)
    const body = { affiliateId: null, reason: "Venda da loja" }

    expect((await read(request("/api/stores/loja/orders/12/affiliate"), order)).status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/loja\/orders\/12\/affiliate$/)
    expect((await change(request("/api/stores/loja/orders/12/affiliate", { method: "PUT", body }), order)).status).toBe(200)
    expect(fetched.mock.calls[1]?.[1]?.method).toBe("PUT")
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual(body)
    expect(mocks.revalidateStore).not.toHaveBeenCalled()
  })

  it("reads a page of the statement, and nothing else the address carried", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ entries: [] }))
    vi.stubGlobal("fetch", fetched)

    await statement(request("/api/stores/loja/affiliates/a%201/statement?page=2&evil=1"), one)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/loja\/affiliates\/a%201\/statement\?page=2$/)
  })

  it("takes an adjustment and a payout to the API", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ entries: [] }, { status: 201 }))
    vi.stubGlobal("fetch", fetched)

    expect((await adjust(request("/api/stores/loja/affiliates/a%201/adjustments", { method: "POST", body: { amountCents: -100, reason: "Devolução" } }), one)).status).toBe(201)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/affiliates\/a%201\/adjustments$/)
    expect((await pay(request("/api/stores/loja/affiliates/a%201/payouts", { method: "POST", body: { amountCents: 100, paidOn: "2026-11-20", method: "PIX", note: null } }), one)).status).toBe(201)
    expect(String(fetched.mock.calls[1]?.[0])).toMatch(/\/affiliates\/a%201\/payouts$/)
  })

  it("takes the photo or the phrase off, and drops what the shop window kept of the affiliate", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ id: "a 1" }))
    vi.stubGlobal("fetch", fetched)

    await removePhoto(request("/api/stores/loja/affiliates/a%201/photo", { method: "DELETE" }), one)
    await removeTagline(request("/api/stores/loja/affiliates/a%201/tagline", { method: "DELETE" }), one)
    expect(fetched.mock.calls.map(([url]) => String(url).replace(/^.*\/stores/, "/stores"))).toEqual(["/stores/loja/affiliates/a%201/photo", "/stores/loja/affiliates/a%201/tagline"])
    expect(mocks.revalidateStore.mock.calls).toEqual([["loja"], ["loja"]])
  })

  it("reads what is owed, and refuses another origin before reaching the API", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ owedCents: 0 }))
    vi.stubGlobal("fetch", fetched)

    expect((await owed(request("/api/stores/loja/affiliate-program/owed"), shop)).status).toBe(200)
    expect((await owed(request("/api/stores/loja/affiliate-program/owed", { origin: "https://evil.test" }), shop)).status).toBe(403)
    expect(fetched).toHaveBeenCalledTimes(1)
  })
})
