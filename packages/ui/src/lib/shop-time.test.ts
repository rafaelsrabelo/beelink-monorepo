// Libs
import { describe, expect, it } from "vitest"

// Lib
import { SHOP_TIME_ZONE, instantOf, remainingOf, wallTimeOf } from "./shop-time"

describe("shop-time", () => {
  it("says an instant on Brasília's clock, whatever zone runs the code", () => {
    expect(wallTimeOf("2026-10-01T02:59:00.000Z", SHOP_TIME_ZONE)).toBe("2026-09-30T23:59")
  })

  it("reads a wall time on Brasília's clock back as the same instant", () => {
    expect(instantOf("2026-09-30T23:59", SHOP_TIME_ZONE)).toBe("2026-10-01T02:59:00.000Z")
    expect(wallTimeOf(instantOf("2026-12-31T00:00")!)).toBe("2026-12-31T00:00")
  })

  it("reads what is not a wall time as none", () => {
    expect(instantOf("")).toBeNull()
    expect(instantOf("amanhã")).toBeNull()
  })

  it("splits what is left into days, hours, minutes and seconds, and never below zero", () => {
    const now = Date.parse("2026-09-26T00:00:00Z")
    expect(remainingOf(now + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5, total: 183845 })
    expect(remainingOf(now - 1000, now)).toMatchObject({ total: 0, days: 0, seconds: 0 })
  })
})
