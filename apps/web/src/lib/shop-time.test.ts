// Libs
import { describe, expect, it } from "vitest"

// App
import { instantOf, shopInputOf, shopMomentOf } from "./shop-time"

describe("the shop's clock", () => {
  it("shows an instant as the field holds it, three hours behind UTC", () => {
    expect(shopInputOf("2026-10-01T12:00:00.000Z")).toBe("2026-10-01T09:00")
    // Late evening in Brasília is already tomorrow in UTC.
    expect(shopInputOf("2026-10-02T01:30:00.000Z")).toBe("2026-10-01T22:30")
    expect(shopInputOf(new Date("2026-01-01T02:59:00.000Z"))).toBe("2025-12-31T23:59")
  })

  it("reads the field back as the same instant, and nothing from an empty or half-typed one", () => {
    expect(instantOf("2026-10-01T09:00")).toBe("2026-10-01T12:00:00.000Z")
    expect(instantOf(shopInputOf("2026-10-02T01:30:00.000Z"))).toBe("2026-10-02T01:30:00.000Z")
    expect(instantOf("")).toBeNull()
    expect(instantOf("2026-10-01")).toBeNull()
    expect(instantOf("2026-13-45T09:00")).toBeNull()
  })

  it("says the day and the minute on the shop's clock", () => {
    expect(shopMomentOf("2026-10-02T01:30:00.000Z", "pt-BR")).toMatch(/^1 de out\. de 2026,? 22:30$/)
  })
})
