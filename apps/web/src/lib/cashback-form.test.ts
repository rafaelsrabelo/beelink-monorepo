// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { adjustmentPayloadOf, cashbackErrorOf, cashbackExampleOf, cashbackFormOf, cashbackPayloadOf } from "./cashback-form"

const text = ptBR.cashback
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100).replace(/\s/g, " ")
const typed = { enabled: true, mode: "STORE" as const, rate: "5", validity: "DAYS" as const, validityDays: "90", minimum: "50,00", maxRedeem: "50" }

describe("the cashback rules' form (BEELINK-242)", () => {
  it("reads the saved rules into the shopkeeper's units", () => {
    expect(cashbackFormOf({ enabled: true, mode: "PRODUCT", rateBps: 250, expiresAfterDays: null, minSubtotalCents: 5000, maxRedeemBps: 10000, updatedAt: null })).toEqual({
      enabled: true,
      mode: "PRODUCT",
      rate: "2,5",
      validity: "NONE",
      validityDays: "",
      minimum: "50,00",
      maxRedeem: "100",
    })
  })

  it("sends basis points, cents and days, and no days when the credit never expires", () => {
    expect(cashbackPayloadOf(typed, text.issues)).toEqual({ payload: { enabled: true, mode: "STORE", rateBps: 500, expiresAfterDays: 90, minSubtotalCents: 5000, maxRedeemBps: 5000 } })
    expect(cashbackPayloadOf({ ...typed, validity: "NONE", validityDays: "abc", minimum: "" }, text.issues)).toEqual({
      payload: { enabled: true, mode: "STORE", rateBps: 500, expiresAfterDays: null, minSubtotalCents: 0, maxRedeemBps: 5000 },
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
    // On with no rate that holds: asked for, never told it is off.
    expect(cashbackExampleOf({ ...typed, rate: "0,333", validity: "NONE" }, money, text.settings)).toBe(text.settings.exampleRateMissing)
    expect(cashbackExampleOf({ ...typed, rate: "3,33", validity: "NONE" }, money, text.settings)).toBe("Num pedido de R$ 100,00, o cliente ganha R$ 3,33 de cashback.")
    expect(cashbackExampleOf({ ...typed, enabled: false }, money, text.settings)).toBe(text.settings.exampleOff)
  })

  /** BEELINK-313: by product there is no one sum to show, and the one rate is kept for the day the shop comes back. */
  it("says each product earns its own rate when the shop gives by product, and still sends the one rate", () => {
    const byProduct = { ...typed, mode: "PRODUCT" as const }
    expect(cashbackExampleOf(byProduct, money, text.settings)).toBe("Em cada produto, o cliente ganha o percentual definido no cadastro dele, para usar em até 90 dias depois da entrega.")
    expect(cashbackPayloadOf(byProduct, text.issues)).toEqual({ payload: { enabled: true, mode: "PRODUCT", rateBps: 500, expiresAfterDays: 90, minSubtotalCents: 5000, maxRedeemBps: 5000 } })
  })

  /** An order of R$ 100,00 under a R$ 150,00 minimum earns nothing at the API: the example never promises it. */
  it("works the example on the minimum when the minimum is above R$ 100,00", () => {
    expect(cashbackExampleOf({ ...typed, minimum: "150,00", validity: "NONE" }, money, text.settings)).toBe("Num pedido de R$ 150,00, o cliente ganha R$ 7,50 de cashback.")
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

  /** Counted as the API counts it: the selector that draws the heart in colour is no character. */
  it("counts a reason as the API does, so one it refuses is never sent", () => {
    expect(adjustmentPayloadOf({ direction: "GIVE", amount: "1", reason: "a❤️" }, text.issues)).toEqual({ issues: { reason: text.issues.reason } })
    expect(adjustmentPayloadOf({ direction: "GIVE", amount: "1", reason: "ok❤️" }, text.issues)).toEqual({ payload: { amountCents: 100, reason: "ok❤️" } })
  })
})

describe("cashbackErrorOf", () => {
  it("says the API's refusal in words, and a code it does not know as the general failure", () => {
    expect(cashbackErrorOf("CASHBACK_BALANCE_INSUFFICIENT", text.errors)).toBe("O cliente tem menos crédito do que isso.")
    expect(cashbackErrorOf("SOMETHING_ELSE", text.errors)).toBe(text.errors.UNKNOWN)
  })
})
