// Libs
import { beforeEach, describe, expect, it, vi } from "vitest"

// The marker throws outside a React Server environment; a unit test is not one.
vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ jar: {} as Record<string, string> }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name in mocks.jar ? { value: mocks.jar[name] } : undefined), has: (name: string) => name in mocks.jar }),
}))

const { popupVisitorAt } = await import("./popup")

beforeEach(() => {
  mocks.jar = {}
})

/** BEELINK-306: what the page asks before it mounts the pop-up at all. */
describe("popupVisitorAt", () => {
  it("is a visitor who closed nothing, for a browser with no cookie of the shop", async () => {
    await expect(popupVisitorAt()).resolves.toEqual({ seen: null, holdsSession: false })
  })

  it("reads the notice the browser closed here, and at which revision", async () => {
    mocks.jar = { bl_popup: "4" }
    await expect(popupVisitorAt()).resolves.toEqual({ seen: { notice: "VISITOR", surface: "DIALOG", revision: 4 }, holdsSession: false })

    // BEELINK-310: the coupon's notice, closed by a customer.
    mocks.jar = { bl_popup: "1000000004", bl_shopper_refresh: "r" }
    await expect(popupVisitorAt()).resolves.toEqual({ seen: { notice: "CUSTOMER", surface: "DIALOG", revision: 4 }, holdsSession: true })

    // BEELINK-311: a strip closed — here at a shop with no pop-up on.
    mocks.jar = { bl_popup: "3000000000", bl_shopper_refresh: "r" }
    await expect(popupVisitorAt()).resolves.toEqual({ seen: { notice: "CUSTOMER", surface: "STRIP", revision: 0 }, holdsSession: true })
  })

  it("reads an edited cookie as none, and no other cookie as this one", async () => {
    mocks.jar = { bl_popup: "sim", bl_consent: "3", bl_cart: "9" }
    await expect(popupVisitorAt()).resolves.toEqual({ seen: null, holdsSession: false })
  })

  // An access token lasts fifteen minutes; the refresh one says the customer is still here.
  it("knows a browser that holds a shopper's session, even with the access token gone", async () => {
    mocks.jar = { bl_shopper_refresh: "r" }
    await expect(popupVisitorAt()).resolves.toMatchObject({ holdsSession: true })

    mocks.jar = { bl_shopper_access: "a" }
    await expect(popupVisitorAt()).resolves.toMatchObject({ holdsSession: true })
  })

  it("does not take the panel's session for a shopper's", async () => {
    mocks.jar = { bl_access: "a", bl_refresh: "r" }
    await expect(popupVisitorAt()).resolves.toMatchObject({ holdsSession: false })
  })
})
