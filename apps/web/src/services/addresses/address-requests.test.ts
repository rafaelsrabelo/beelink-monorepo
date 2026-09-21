// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { searchAddresses } from "./address-requests"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("searchAddresses", () => {
  /**
   * The bug this exists for: the first version sent a bare GET, and every search came back 415
   * "Send JSON". `refuseCrossOrigin` requires the header on a bodyless read too — that is what
   * makes a cross-site form unable to reach the handler at all — and the convention is written
   * down in store-requests.ts, where it was not read.
   */
  it("says it speaks JSON, which a bodyless read still has to do", async () => {
    const fetch = vi.fn(async () => Response.json([]))
    vi.stubGlobal("fetch", fetch)

    await searchAddresses("Rua Lavras")

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("/api/addresses/search?q=Rua%20Lavras")
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json")
  })

  it("answers with the suggestions the handler sent", async () => {
    const suggestion = { id: "1", label: "Rua Lavras, Fortaleza, CE" }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([suggestion])))

    expect(await searchAddresses("Rua Lavras")).toEqual([suggestion])
  })

  /**
   * Nothing to suggest is an ordinary answer. An address box that puts an error under a field
   * while someone is still typing is worse than one that quietly suggests nothing — every field
   * under it can still be filled by hand.
   */
  it.each([
    ["a refusal", async () => Response.json({ errorCode: "RATE_LIMITED" }, { status: 429 })],
    ["an answer that is not a list", async () => Response.json({ features: [] })],
    ["a body that is not JSON", async () => new Response("nope")],
  ])("gives an empty list for %s, rather than throwing under the field", async (_name, answer) => {
    vi.stubGlobal("fetch", vi.fn(answer))

    await expect(searchAddresses("Rua Lavras")).resolves.toEqual([])
  })

  it("survives a network that never answered", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("ECONNRESET")
    }))

    await expect(searchAddresses("Rua Lavras")).rejects.toThrow()
  })
})
