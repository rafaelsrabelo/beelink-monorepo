// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { callApi } from "./api"

function stubFetch() {
  const spy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
  vi.stubGlobal("fetch", spy)

  return spy
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("callApi", () => {
  /**
   * Fastify refuses a request that says `application/json` and carries nothing — "Body cannot be
   * empty when content-type is set to 'application/json'". Declared unconditionally, that header
   * broke every DELETE in the panel, which has no body by definition. Reported on a banner; it was
   * true of products and categories too.
   */
  it("declares no content-type on a request with no body", async () => {
    const spy = stubFetch()

    await callApi({ path: "/stores/lessari/sections/1", method: "DELETE" })

    const headers = (spy.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>
    expect(headers["content-type"]).toBeUndefined()
  })

  it("declares it when there is a body", async () => {
    const spy = stubFetch()

    await callApi({ path: "/stores/lessari", method: "PUT", body: { name: "Lessari" } })

    const headers = (spy.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>
    expect(headers["content-type"]).toBe("application/json")
  })

  it("sends nothing as the body when there is none", async () => {
    const spy = stubFetch()

    await callApi({ path: "/stores/lessari/sections/1", method: "DELETE" })

    expect((spy.mock.calls[0]?.[1] as RequestInit).body).toBeUndefined()
  })

  it("carries the token and the visitor's address, which the rate limit reads", async () => {
    const spy = stubFetch()

    await callApi({ path: "/stores", method: "GET", accessToken: "abc", clientIp: "203.0.113.4" })

    const headers = (spy.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>
    expect(headers.authorization).toBe("Bearer abc")
    expect(headers["x-forwarded-for"]).toBe("203.0.113.4")
  })
})
