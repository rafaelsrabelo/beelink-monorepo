// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

const jar = new Map<string, string>()
const redirect = vi.fn((to: string) => {
  throw new Error(`redirected to ${to}`)
})

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined), has: (name: string) => jar.has(name) }),
}))
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }))

const { requireUser } = await import("./session")

afterEach(() => {
  jar.clear()
  redirect.mockClear()
})

describe("a screen with no signed-out version", () => {
  it("sends a browser with no session through the route that clears its cookies", async () => {
    await expect(requireUser()).rejects.toThrow("redirected to /api/session/expired")
  })

  /** BEELINK-169: the proxy could not renew — the API did not answer — so the session is not over. */
  it("fails, cookies kept, when the refresh is there but no access token came of it", async () => {
    jar.set("bl_refresh", "still-good")

    await expect(requireUser()).rejects.toThrow("could not be renewed")
    expect(redirect).not.toHaveBeenCalled()
  })
})
