// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const refund = { amountCents: 1990, reason: "Produto com defeito", refundableCents: 5990 }

function request(init: { origin?: string; signedIn?: boolean } = {}) {
  return new NextRequest("http://localhost:3000/api/stores/lessari/orders/12/refunds", {
    method: "POST",
    headers: { "content-type": "application/json", origin: init.origin ?? "http://localhost:3000", ...(init.signedIn === false ? {} : { cookie: "bl_access=owner-access" }) },
    body: JSON.stringify(refund),
  })
}

const order = { params: Promise.resolve({ slug: "lessari", number: "12" }) }

afterEach(() => vi.unstubAllGlobals())

describe("a refund asked from the panel (BEELINK-208)", () => {
  it("asks the API as the owner, with the refund as it was typed, and answers the order", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ number: 12, status: "RECEIVED" }))
    vi.stubGlobal("fetch", fetched)

    const response = await POST(request(), order)

    expect([response.status, await response.json()]).toEqual([200, { number: 12, status: "RECEIVED" }])
    expect(String(fetched.mock.calls[0]?.[0]).replace(/^.*\/api/, "")).toBe("/stores/lessari/orders/12/refunds")
    expect(fetched.mock.calls[0]?.[1]?.method).toBe("POST")
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual(refund)
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  it("hands back Asaas's refusal as the API told it, with its details", async () => {
    const refusal = { statusCode: 502, errorCode: "REFUND_REFUSED", message: "Asaas refused the refund", details: { reason: "O prazo para estorno expirou." } }
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json(refusal, { status: 502 })))

    const response = await POST(request(), order)

    expect([response.status, await response.json()]).toEqual([502, refusal])
  })

  it("refuses another origin, and a visitor, without asking the API", async () => {
    const fetched = vi.fn<Fetched>()
    vi.stubGlobal("fetch", fetched)

    expect((await POST(request({ origin: "https://evil.example" }), order)).status).toBe(403)
    expect((await POST(request({ signedIn: false }), order)).status).toBe(401)
    expect(fetched).not.toHaveBeenCalled()
  })
})
