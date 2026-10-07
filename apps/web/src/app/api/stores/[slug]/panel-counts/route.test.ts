// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

const COUNTS = { openOrders: 4, unreadConversations: 2, unreadMessages: 3, unseenReviews: 1 }

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/stores/loja/panel-counts", {
    headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: "bl_access=owner-access", ...headers },
  })
}

const context = { params: Promise.resolve({ slug: "loja" }) }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the panel menu's counts, for the panel", () => {
  it("asks the API once, as the owner, and answers what it said", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json(COUNTS))
    vi.stubGlobal("fetch", fetched)

    const response = await GET(request(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(COUNTS)
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(String(fetched.mock.calls[0]?.[0])).toMatch(/\/stores\/loja\/panel-counts$/)
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  it("hands a refusal on as it came: an ended session reads as one in the page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "No" }, { status: 401 })))

    const response = await GET(request(), context)

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ errorCode: "AUTH_UNAUTHENTICATED" })
  })

  it("refuses another site's page before the API is asked anything", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)

    const response = await GET(request({ origin: "https://outro.example" }), context)

    expect(response.status).toBe(403)
    expect(fetched).not.toHaveBeenCalled()
  })
})
