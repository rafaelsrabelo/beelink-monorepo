// Libs
import { describe, expect, it } from "vitest"

// App
import { isPageLockedError } from "./page-lock"

describe("a locked page's refusal (BEELINK-223)", () => {
  it("is told by its code alone", () => {
    expect(isPageLockedError({ errorCode: "PAGE_LOCKED", details: { reason: "TRIAL_EXPIRED" } })).toBe(true)
    expect(isPageLockedError({ errorCode: "STORE_FORBIDDEN" })).toBe(false)
    expect(isPageLockedError(new Error("PAGE_LOCKED"))).toBe(false)
    expect(isPageLockedError(null)).toBe(false)
  })
})
