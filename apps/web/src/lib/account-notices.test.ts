// Libs
import { describe, expect, it } from "vitest"

// App
import { offersSinceOf } from "./account-notices"

describe("when the shopper said yes to offers", () => {
  it("is the day in São Paulo, and nothing while offers are off or never chosen", () => {
    // 01:30 in UTC is still the day before in São Paulo.
    expect(offersSinceOf({ orders: true, favorites: true, offers: true, offersChosenAt: "2026-09-30T01:30:00.000Z" }, "pt-BR")).toBe("29/09/2026")
    expect(offersSinceOf({ orders: true, favorites: true, offers: false, offersChosenAt: "2026-09-30T01:30:00.000Z" }, "pt-BR")).toBeNull()
    expect(offersSinceOf({ orders: true, favorites: true, offers: true, offersChosenAt: null }, "pt-BR")).toBeNull()
  })
})
