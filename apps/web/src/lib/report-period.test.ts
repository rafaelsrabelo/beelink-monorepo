// Libs
import { describe, expect, it } from "vitest"

// App
import { originExampleUrl, reportDayText, reportDaysOf, reportPagesOf, reportPeriodOf, salesByOriginHref, storeFunnelHref } from "./report-period"

describe("reportPeriodOf", () => {
  it("reads the period off the address", () => {
    expect(reportPeriodOf(new URLSearchParams("period=7"))).toBe(7)
    expect(reportPeriodOf(new URLSearchParams("period=90"))).toBe(90)
  })

  it("reads a bare address, and anything it cannot mean, as thirty days", () => {
    for (const search of ["", "period=", "period=14", "period=7d", "period=-7", "period=07", "period=3650", "from=2020-01-01"]) {
      expect(reportPeriodOf(new URLSearchParams(search)), search).toBe(30)
    }
  })
})

describe("salesByOriginHref", () => {
  it("writes the period on the address, and leaves the default out", () => {
    expect(salesByOriginHref("loja", 30)).toBe("/admin/loja/reports/origins")
    expect(salesByOriginHref("loja", 7)).toBe("/admin/loja/reports/origins?period=7")
    expect(reportPagesOf("loja")).toEqual({ home: "/admin/loja/reports", origins: "/admin/loja/reports/origins" })
  })
})

describe("storeFunnelHref", () => {
  it("is the funnel's page under the reports, with the period on the address and the default left out", () => {
    expect(storeFunnelHref("loja")).toBe("/admin/loja/reports/funnel")
    expect(storeFunnelHref("loja", 30)).toBe("/admin/loja/reports/funnel")
    expect(storeFunnelHref("loja", 90)).toBe("/admin/loja/reports/funnel?period=90")
  })
})

describe("reportDaysOf", () => {
  it("counts back from today, both days in", () => {
    const noon = new Date("2026-10-06T15:00:00.000Z")

    expect(reportDaysOf(7, noon)).toEqual({ from: "2026-09-30", to: "2026-10-06" })
    expect(reportDaysOf(30, noon)).toEqual({ from: "2026-09-07", to: "2026-10-06" })
    expect(reportDaysOf(90, noon)).toEqual({ from: "2026-07-09", to: "2026-10-06" })
  })

  it("takes today from the shop's clock, not from UTC", () => {
    // 23:30 in Brasília on the 5th is already the 6th in UTC.
    expect(reportDaysOf(7, new Date("2026-10-06T02:30:00.000Z")).to).toBe("2026-10-05")
    expect(reportDaysOf(7, new Date("2026-10-06T03:00:00.000Z")).to).toBe("2026-10-06")
  })
})

describe("reportDayText", () => {
  it("says a day as itself, wherever the reader's clock is", () => {
    expect(reportDayText("2026-10-06", "pt-BR")).toBe("06/10/2026")
    expect(reportDayText("2026-01-01", "en")).toBe("01/01/2026")
  })
})

describe("originExampleUrl", () => {
  it("is the shop's own address with the three labels on it", () => {
    expect(originExampleUrl("https://beelink.biz", "doces-da-ana")).toBe("https://beelink.biz/doces-da-ana?utm_source=instagram&utm_medium=social&utm_campaign=minha-campanha")
  })
})
