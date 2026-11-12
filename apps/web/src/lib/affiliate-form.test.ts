// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import {
  affiliateErrorOf,
  affiliateSettingsFormOf,
  affiliateSettingsPayloadOf,
  commissionRateOf,
  commissionTableFormOf,
  commissionTablePayloadOf,
  payoutCalendarOf,
  payoutDayFormatter,
} from "./affiliate-form"

const issues = ui.affiliates.issues
const periods = [
  { firstDay: "2026-11-01", lastDay: "2026-11-10", dueOn: "2026-11-20" },
  { firstDay: "2026-11-11", lastDay: "2026-11-20", dueOn: "2026-11-30" },
  { firstDay: "2026-11-21", lastDay: "2026-11-30", dueOn: "2026-12-10" },
]

describe("the affiliate forms' crossing (IMPULSEIA-102)", () => {
  it("reads a commission as basis points, 0 included, and an empty field as following the table", () => {
    expect(commissionRateOf("12,5")).toBe(1250)
    expect(commissionRateOf("0")).toBe(0)
    expect(commissionRateOf("100")).toBe(10_000)
    expect(commissionRateOf("  ")).toBeNull()
    expect(commissionRateOf("100,01")).toBeUndefined()
    expect(commissionRateOf("-5")).toBeUndefined()
    expect(commissionRateOf("dez")).toBeUndefined()
  })

  it("turns the programme into the form and back, blank terms being none", () => {
    const form = affiliateSettingsFormOf({ enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null, termsVersion: 0, updatedAt: "2026-11-11T12:00:00.000Z" })

    expect(form).toEqual({ enabled: true, attributionDays: 30, payoutDelayDays: "10", termsText: "" })
    expect(affiliateSettingsPayloadOf(form, issues)).toEqual({ payload: { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null } })
    expect(affiliateSettingsPayloadOf({ ...form, termsText: "  Pix  " }, issues)).toEqual({ payload: { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: "Pix" } })
    expect(affiliateSettingsPayloadOf({ ...form, payoutDelayDays: "0" }, issues)).toMatchObject({ payload: { payoutDelayDays: 0 } })
  })

  it("says each field out of range, and sends nothing", () => {
    const form = { enabled: true, attributionDays: 30, payoutDelayDays: "61", termsText: "a".repeat(10_001) }

    expect(affiliateSettingsPayloadOf(form, issues)).toEqual({ issues: { payoutDelayDays: issues.payoutDelayDays, termsText: issues.termsText } })
    expect(affiliateSettingsPayloadOf({ ...form, payoutDelayDays: "2,5", termsText: "" }, issues)).toEqual({ issues: { payoutDelayDays: issues.payoutDelayDays } })
  })

  it("follows the delay as typed on the API's periods, and shows none for a delay that does not hold", () => {
    const day = payoutDayFormatter("pt-BR")

    expect(payoutCalendarOf(periods, "10", day)).toEqual([
      { from: "1 de nov.", to: "10 de nov.", due: "20 de nov." },
      { from: "11 de nov.", to: "20 de nov.", due: "30 de nov." },
      { from: "21 de nov.", to: "30 de nov.", due: "10 de dez." },
    ])
    expect(payoutCalendarOf(periods, "0", day).map((row) => row.due)).toEqual(["10 de nov.", "20 de nov.", "30 de nov."])
    expect(payoutCalendarOf(periods, "", day)).toEqual([])
    expect(payoutCalendarOf(periods, "61", day)).toEqual([])
  })

  it("reads a table's name and rate, refusing an empty or long name and a rate out of range", () => {
    expect(commissionTableFormOf({ name: "Padrão", defaultRateBps: 1250 })).toEqual({ name: "Padrão", rate: "12,5" })
    expect(commissionTablePayloadOf({ name: "  Influencers ", rate: "15" }, issues)).toEqual({ payload: { name: "Influencers", defaultRateBps: 1500 } })
    expect(commissionTablePayloadOf({ name: "Zero", rate: "0" }, issues)).toEqual({ payload: { name: "Zero", defaultRateBps: 0 } })
    expect(commissionTablePayloadOf({ name: " ", rate: "" }, issues)).toEqual({ issues: { name: issues.name, rate: issues.rate } })
    expect(commissionTablePayloadOf({ name: "a".repeat(61), rate: "101" }, issues)).toEqual({ issues: { name: issues.name, rate: issues.rate } })
  })

  it("says the API's refusal, and the general failure for a code it does not know", () => {
    expect(affiliateErrorOf("COMMISSION_TABLE_NAME_TAKEN", ui.affiliates.errors)).toBe("Já existe uma tabela com esse nome.")
    expect(affiliateErrorOf("SOMETHING_ELSE", ui.affiliates.errors)).toBe(ui.affiliates.errors.UNKNOWN)
  })
})
