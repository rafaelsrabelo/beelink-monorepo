// Libs
import { describe, expect, it } from "vitest"

// App
import { affiliateVisitOf, encodeAffiliateVisit, heldBeforeSessions } from "./affiliate-cookie"

const ID = "0199a1b2-0000-7000-8000-000000000001"
const NOW = Date.UTC(2026, 10, 12, 15)
const DAY = 24 * 60 * 60 * 1000

describe("the affiliate's cookie", () => {
  it("holds the affiliate's id and the instant of the visit, in its session shape, and nothing else", () => {
    expect(encodeAffiliateVisit({ affiliateId: ID, visitedAt: NOW })).toBe(`s1.${ID}.${NOW}`)
    expect(affiliateVisitOf(`s1.${ID}.${NOW}`, NOW)).toEqual({ affiliateId: ID, visitedAt: NOW })
  })

  it("reads an id in any case as the one the API keeps", () => {
    expect(affiliateVisitOf(`s1.${ID.toUpperCase()}.${NOW}`, NOW)?.affiliateId).toBe(ID)
  })

  it("believes no value written while the cookie lasted the programme's days, and knows it for one to clear", () => {
    expect(affiliateVisitOf(`${ID}.${NOW}`, NOW)).toBeNull()
    expect(heldBeforeSessions(`${ID}.${NOW}`)).toBe(true)
    expect(heldBeforeSessions(`s1.${ID}.${NOW}`)).toBe(false)
    expect(heldBeforeSessions(undefined)).toBe(false)
  })

  it.each([
    ["nothing", undefined],
    ["an empty value", ""],
    ["no instant", `s1.${ID}`],
    ["an id that is no id", `s1.nao-e-um-id-de-afiliado-aaaaaaaaaaaaa.${NOW}`],
    ["an instant that is no number", `s1.${ID}.ontem`],
    ["more than its parts", `s1.${ID}.${NOW}.extra`],
    ["another shape", `s2.${ID}.${NOW}`],
    ["a visit from the future", `s1.${ID}.${NOW + 10 * 60_000}`],
    ["a visit older than any programme credits", `s1.${ID}.${NOW - 90 * DAY}`],
  ])("believes %s to be no visit", (_, raw) => {
    expect(affiliateVisitOf(raw, NOW)).toBeNull()
  })

  it("takes a clock a little ahead as now, and a visit of 89 days as one", () => {
    expect(affiliateVisitOf(`s1.${ID}.${NOW + 60_000}`, NOW)?.visitedAt).toBe(NOW)
    expect(affiliateVisitOf(`s1.${ID}.${NOW - 89 * DAY}`, NOW)).not.toBeNull()
  })
})
