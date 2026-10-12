// Libs
import { beforeEach, describe, expect, it, vi } from "vitest"

// The marker throws outside a React Server environment; a unit test is not one.
vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ jar: {} as Record<string, string> }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name in mocks.jar ? { value: mocks.jar[name] } : undefined) }),
}))

const { siteConsentAt } = await import("./site-consent")
const { consentAt } = await import("./consent")

beforeEach(() => {
  mocks.jar = {}
})

/** BEELINK-319: what the landing asks before it draws the notice, and AA4 before it loads anything. */
describe("siteConsentAt", () => {
  it("is null for a visitor nobody asked yet", async () => {
    await expect(siteConsentAt()).resolves.toBeNull()
  })

  it("reads the answer the browser sent for the site", async () => {
    mocks.jar = { bl_site_consent: "granted" }
    await expect(siteConsentAt()).resolves.toBe("granted")

    mocks.jar = { bl_site_consent: "denied" }
    await expect(siteConsentAt()).resolves.toBe("denied")
  })

  it("reads an edited cookie as no answer", async () => {
    mocks.jar = { bl_site_consent: "sim" }
    await expect(siteConsentAt()).resolves.toBeNull()
  })
})

/**
 * The two answers are to two questions. At a shop's own domain its `bl_consent` is on `/`, and on the
 * platform's host `bl_site_consent` is sent to every shop's pages: one request may carry both.
 */
describe("the site's answer and a shop's", () => {
  it("never reads a shop's yes as the site's", async () => {
    mocks.jar = { bl_consent: "granted" }

    await expect(siteConsentAt()).resolves.toBeNull()
    await expect(consentAt()).resolves.toBe("granted")
  })

  it("never reads the site's yes as a shop's", async () => {
    mocks.jar = { bl_site_consent: "granted" }

    await expect(consentAt()).resolves.toBeNull()
    await expect(siteConsentAt()).resolves.toBe("granted")
  })

  it("keeps each answer its own when a request carries both", async () => {
    mocks.jar = { bl_consent: "denied", bl_site_consent: "granted" }
    await expect(Promise.all([consentAt(), siteConsentAt()])).resolves.toEqual(["denied", "granted"])

    mocks.jar = { bl_consent: "granted", bl_site_consent: "denied" }
    await expect(Promise.all([consentAt(), siteConsentAt()])).resolves.toEqual(["granted", "denied"])
  })
})
