// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const PATH = "/api/stores/lessari/integrations/meta-pixel/test-event"

function request(init: { body?: object; origin?: string; signedIn?: boolean; contentType?: string; forwardedFor?: string } = {}) {
  return new NextRequest(`http://localhost:3000${PATH}`, {
    method: "POST",
    headers: {
      "content-type": init.contentType ?? "application/json",
      origin: init.origin ?? "http://localhost:3000",
      ...(init.forwardedFor ? { "x-forwarded-for": init.forwardedFor } : {}),
      ...(init.signedIn === false ? {} : { cookie: "bl_access=owner-access" }),
    },
    body: JSON.stringify(init.body ?? { testEventCode: "TEST12345" }),
  })
}

const shop = { params: Promise.resolve({ slug: "lessari" }) }

afterEach(() => vi.unstubAllGlobals())

describe("the pixel's test event, for the panel (BEELINK-274)", () => {
  it("asks the API to send one, as the owner, and answers what Meta said", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ outcome: "ACCEPTED", detail: null }))
    vi.stubGlobal("fetch", fetched)

    const response = await POST(request({ forwardedFor: "203.0.113.9" }), shop)

    expect([response.status, await response.json()]).toEqual([200, { outcome: "ACCEPTED", detail: null }])
    const [url, init] = fetched.mock.calls[0]!
    expect([String(url).replace(/^.*\/api/, ""), init?.method]).toEqual(["/stores/lessari/integrations/meta-pixel/test-event", "POST"])
    expect(JSON.parse(String(init?.body))).toEqual({ testEventCode: "TEST12345" })
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer owner-access")
    // The API limits it per address: it has to see the shopkeeper's, not this server's.
    expect(new Headers(init?.headers).get("x-forwarded-for")).toBe("203.0.113.9")
  })

  it.each([
    [429, "RATE_LIMITED"],
    [400, "META_PIXEL_TEST_CODE_INVALID"],
    [409, "INTEGRATION_NOT_CONNECTED"],
  ] as const)("answers the API's refusal (%i %s) as it came", async (status, errorCode) => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: status, errorCode, message: "x" }, { status })))

    const response = await POST(request(), shop)

    expect([response.status, (await response.json()).errorCode]).toEqual([status, errorCode])
  })

  it("refuses another site, a body that is not JSON, or no session, before calling anything", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({}))
    vi.stubGlobal("fetch", fetched)

    expect((await POST(request({ origin: "https://evil.test" }), shop)).status).toBe(403)
    expect((await POST(request({ contentType: "text/plain" }), shop)).status).toBe(415)
    expect((await POST(request({ signedIn: false }), shop)).status).toBe(401)
    expect(fetched).not.toHaveBeenCalled()
  })
})
