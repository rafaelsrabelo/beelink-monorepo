// Libs
import { describe, expect, it } from "vitest"

// UI
import { defaultMessages } from "@harness-monorepo/ui/locales/index"

// App
import { adjustmentPayloadOf, emptyPayoutOf, orderAffiliatePayloadOf, payoutPayloadOf, shopTodayOf } from "./affiliate-money-form"

const issues = defaultMessages.affiliates.moneyIssues

describe("the money's forms (IMPULSEIA-107)", () => {
  it("moves an order to an affiliate or to nobody, only with a reason", () => {
    expect(orderAffiliatePayloadOf({ affiliateId: "", reason: "  Venda da loja " }, issues)).toEqual({ payload: { affiliateId: null, reason: "Venda da loja" } })
    expect(orderAffiliatePayloadOf({ affiliateId: "a1", reason: "ok" }, issues)).toEqual({ issues: { reason: issues.reason } })
  })

  it("adjusts either way, in reais read only where they have one reading", () => {
    expect(adjustmentPayloadOf({ direction: "debit", amount: "12,50", reason: "Devolução" }, issues)).toEqual({ payload: { amountCents: -1250, reason: "Devolução" } })
    expect(adjustmentPayloadOf({ direction: "credit", amount: "1.000", reason: "Bônus" }, issues)).toEqual({ payload: { amountCents: 100_000, reason: "Bônus" } })
    expect(adjustmentPayloadOf({ direction: "credit", amount: "0", reason: "" }, issues)).toEqual({ issues: { amount: issues.amount, reason: issues.reason } })
  })

  it("starts a payout at what is available, today, by Pix", () => {
    expect(emptyPayoutOf(21_000, "2026-11-20")).toEqual({ amount: "210,00", paidOn: "2026-11-20", method: "PIX", note: "" })
    expect(emptyPayoutOf(-100, "2026-11-20").amount).toBe("")
  })

  it("refuses a payout of nothing, dated after today, or with too long a note", () => {
    const value = { amount: "210,00", paidOn: "2026-11-20", method: "TRANSFER" as const, note: "  TED " }
    expect(payoutPayloadOf(value, "2026-11-20", issues)).toEqual({ payload: { amountCents: 21_000, paidOn: "2026-11-20", method: "TRANSFER", note: "TED" } })
    expect(payoutPayloadOf({ ...value, note: "" }, "2026-11-20", issues)).toMatchObject({ payload: { note: null } })
    expect(payoutPayloadOf({ ...value, amount: "", paidOn: "2026-11-21", note: "a".repeat(201) }, "2026-11-20", issues)).toEqual({ issues: { amount: issues.amount, paidOn: issues.paidOn, note: issues.note } })
  })

  it("reads today on the shop's calendar, which is behind UTC at night", () => {
    expect(shopTodayOf(new Date("2026-11-21T01:30:00.000Z"))).toBe("2026-11-20")
    expect(shopTodayOf(new Date("2026-11-21T04:00:00.000Z"))).toBe("2026-11-21")
  })
})
