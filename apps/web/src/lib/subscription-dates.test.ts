// Libs
import { describe, expect, it } from "vitest"

// App
import { brasiliaDayOf, dayInWords, lastDayBefore, renewalDayOf } from "./subscription-dates"

describe("the days a page's subscription is told in, on Brasília's calendar (BEELINK-293)", () => {
  it("reads the day in Brasília: 22h there is still today, though UTC is already tomorrow", () => {
    expect(brasiliaDayOf(new Date("2026-10-16T01:59:59.999Z"))).toBe("2026-10-15")
    expect(brasiliaDayOf(new Date("2026-10-16T03:00:00.000Z"))).toBe("2026-10-16")
  })

  it("says the last day an end covers: the midnight closing a day is that day's end", () => {
    // The API's `currentPeriodEndsAt` for a period paid until 15/11: the first instant of the 16th, in Brasília.
    expect(lastDayBefore("2026-11-16T03:00:00.000Z")).toBe("2026-11-15")
    expect(lastDayBefore("2026-11-16T03:00:00.001Z")).toBe("2026-11-16")
  })

  it.each([
    ["2026-10-15", 1, "2026-11-15"],
    ["2026-10-15", 6, "2027-04-15"],
    ["2026-10-15", 12, "2027-10-15"],
    // The month's last day, where it lacks the first charge's.
    ["2026-10-31", 1, "2026-11-30"],
    ["2026-08-31", 6, "2027-02-28"],
    ["2027-08-31", 6, "2028-02-29"],
    ["2028-02-29", 12, "2029-02-28"],
    ["2026-12-31", 1, "2027-01-31"],
    ["2026-01-30", 1, "2026-02-28"],
  ])("renews what began on %s, %i months on, on %s", (day, months, renewal) => {
    expect(renewalDayOf(day, months)).toBe(renewal)
  })

  it("refuses what is not a day", () => {
    expect(() => renewalDayOf("15/10/2026", 1)).toThrow(RangeError)
  })

  it("writes a day as the reader's language does, whatever the browser's own zone", () => {
    expect(dayInWords("2026-11-15", "pt-BR")).toBe("15/11/2026")
    expect(dayInWords("2026-11-15", "en")).toBe("11/15/2026")
    expect(dayInWords("2027-01-01", "pt-BR")).toBe("01/01/2027")
  })
})
