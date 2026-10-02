// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { adjustmentPayloadOf, cashbackErrorOf, cashbackExampleOf, cashbackFormOf, cashbackPayloadOf } from "./cashback-form"

const text = ptBR.cashback
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100).replace(/\s/g, " ")
const typed = { enabled: true, rate: "5", validity: "DAYS" as const, validityDays: "90", minimum: "50,00", maxRedeem: "50" }

describe("the cashback rules' form (BEELINK-242)", () => {
  it("reads the saved rules into the shopkeeper's units", () => {
    expect(cashbackFormOf({ enabled: true, rateBps: 250, expiresAfterDays: null, minSubtotalCents: 5000, maxRedeemBps: 10000, updatedAt: null })).toEqual({
      enabled: true,
      rate: "2,5",
      validity: "NONE",
      validityDays: "",
      minimum: "50,00",
      maxRedeem: "100",
    })
  })

  it("sends basis points, cents and days, and no days when the credit never expires", () => {
    expect(cashbackPayloadOf(typed, text.issues)).toEqual({ payload: { enabled: true, rateBps: 500, expiresAfterDays: 90, minSubtotalCents: 5000, maxRedeemBps: 5000 } })
    expect(cashbackPayloadOf({ ...typed, validity: "NONE", validityDays: "abc", minimum: "" }, text.issues)).toEqual({
      payload: { enabled: true, rateBps: 500, expiresAfterDays: null, minSubtotalCents: 0, maxRedeemBps: 5000 },
    })
  })

  it("says what to correct, field by field, and sends nothing", () => {
    expect(cashbackPayloadOf({ ...typed, rate: "0", validityDays: "0", minimum: "-1", maxRedeem: "101" }, text.issues)).toEqual({
      issues: { rate: text.issues.rate, validityDays: text.issues.validityDays, minimum: text.issues.minimum, maxRedeem: text.issues.maxRedeem },
    })
    expect(cashbackPayloadOf({ ...typed, validityDays: "3651" }, text.issues)).toEqual({ issues: { validityDays: text.issues.validityDays } })
  })

  it("works the example out as the API does, rounded down, with the validity when there is one", () => {
    expect(cashbackExampleOf(typed, money, text.settings)).toBe("Num pedido de R$ 100,00, o cliente ganha R$ 5,00 de cashback, para usar em até 90 dias depois da entrega.")
    expect(cashbackExampleOf({ ...typed, rate: "0,333", validity: "NONE" }, money, text.settings)).toBe(text.settings.exampleOff)
    expect(cashbackExampleOf({ ...typed, rate: "3,33", validity: "NONE" }, money, text.settings)).toBe("Num pedido de R$ 100,00, o cliente ganha R$ 3,33 de cashback.")
    expect(cashbackExampleOf({ ...typed, enabled: false }, money, text.settings)).toBe(text.settings.exampleOff)
  })
})

describe("the adjustment's form", () => {
  it("gives a positive amount and takes a negative one, the reason trimmed", () => {
    expect(adjustmentPayloadOf({ direction: "GIVE", amount: "15,00", reason: "  Atraso  " }, text.issues)).toEqual({ payload: { amountCents: 1500, reason: "Atraso" } })
    expect(adjustmentPayloadOf({ direction: "TAKE", amount: "15", reason: "Lançado em dobro" }, text.issues)).toEqual({ payload: { amountCents: -1500, reason: "Lançado em dobro" } })
  })

  it("asks for an amount and a reason of three characters or more", () => {
    expect(adjustmentPayloadOf({ direction: "GIVE", amount: "0", reason: "ok" }, text.issues)).toEqual({ issues: { amount: text.issues.amount, reason: text.issues.reason } })
  })
})

describe("cashbackErrorOf", () => {
  it("says the API's refusal in words, and a code it does not know as the general failure", () => {
    expect(cashbackErrorOf("CASHBACK_BALANCE_INSUFFICIENT", text.errors)).toBe("O cliente tem menos crédito do que isso.")
    expect(cashbackErrorOf("SOMETHING_ELSE", text.errors)).toBe(text.errors.UNKNOWN)
  })
})
