// Libs
import { beforeEach, describe, expect, it, vi } from "vitest"

// The marker throws outside a React Server environment; a unit test is not one.
vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ jar: {} as Record<string, string> }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name in mocks.jar ? { value: mocks.jar[name] } : undefined) }),
}))

const { consentAt } = await import("./consent")

beforeEach(() => {
  mocks.jar = {}
})

/** BEELINK-271: what X5 asks before it draws the loader, and X7 when an order is placed. */
describe("consentAt", () => {
  it("is null for a visitor nobody asked yet", async () => {
    await expect(consentAt()).resolves.toBeNull()
  })

  it("reads the answer the browser sent for this shop", async () => {
    mocks.jar = { bl_consent: "granted" }
    await expect(consentAt()).resolves.toBe("granted")

    mocks.jar = { bl_consent: "denied" }
    await expect(consentAt()).resolves.toBe("denied")
  })

  it("reads no other cookie as an answer, and an edited one as none", async () => {
    mocks.jar = { bl_cart: "granted", bl_consent: "sim" }
    await expect(consentAt()).resolves.toBeNull()
  })
})
