// Libs
import { describe, expect, it } from "vitest"

// App
import { affiliateVisitOf, encodeAffiliateVisit, hiddenCookieOf } from "./affiliate-cookie"

const ID = "0199a1b2-0000-7000-8000-000000000001"
const NOW = Date.UTC(2026, 10, 12, 15)
const DAY = 24 * 60 * 60 * 1000

describe("the affiliate's cookie", () => {
  it("holds the affiliate's id and the instant of the visit, and nothing else", () => {
    expect(encodeAffiliateVisit({ affiliateId: ID, visitedAt: NOW })).toBe(`${ID}.${NOW}`)
    expect(affiliateVisitOf(`${ID}.${NOW}`, NOW)).toEqual({ affiliateId: ID, visitedAt: NOW })
  })

  it("reads an id in any case as the one the API keeps", () => {
    expect(affiliateVisitOf(`${ID.toUpperCase()}.${NOW}`, NOW)?.affiliateId).toBe(ID)
  })

  it.each([
    ["nothing", undefined],
    ["an empty value", ""],
    ["no instant", ID],
    ["an id that is no id", `nao-e-um-id-de-afiliado-aaaaaaaaaaaaa.${NOW}`],
    ["an instant that is no number", `${ID}.ontem`],
    ["more than the two parts", `${ID}.${NOW}.extra`],
    ["a visit from the future", `${ID}.${NOW + 10 * 60_000}`],
    ["a visit older than any programme credits", `${ID}.${NOW - 90 * DAY}`],
  ])("believes %s to be no visit", (_, raw) => {
    expect(affiliateVisitOf(raw, NOW)).toBeNull()
  })

  it("takes a clock a little ahead as now, and a visit of 89 days as one", () => {
    expect(affiliateVisitOf(`${ID}.${NOW + 60_000}`, NOW)?.visitedAt).toBe(NOW)
    expect(affiliateVisitOf(`${ID}.${NOW - 89 * DAY}`, NOW)).not.toBeNull()
  })

  it("closes the strip for the browser's session alone, on the shop's own path", () => {
    expect(hiddenCookieOf({ slug: "lessari" }, ID, true)).toBe(`bl_affiliate_hidden=${ID}; Path=/lessari; SameSite=Lax; Secure`)
    expect(hiddenCookieOf({ slug: "lessari", ownDomain: true }, ID, false)).toBe(`bl_affiliate_hidden=${ID}; Path=/; SameSite=Lax`)
  })
})
