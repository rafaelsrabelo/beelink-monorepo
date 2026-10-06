// Libs
import { describe, expect, it } from "vitest"

// App
import { ptBR } from "@/locales/pt-BR"
import { OrderRequestError } from "@/services/orders/order-requests"
import { orderRefundRefusalOf } from "./order-refund-refusal"

const said = (code: string, details?: unknown) => orderRefundRefusalOf(new OrderRequestError(code, details), ptBR, "pt-BR")?.replace(/\s/g, " ")

describe("orderRefundRefusalOf — why a refund did not go through, in the shop's words (BEELINK-208)", () => {
  it("says nothing with no error", () => {
    expect(orderRefundRefusalOf(null, ptBR, "pt-BR")).toBeNull()
  })

  it("says the want of balance, with what the shop can do about it", () => {
    expect(said("REFUND_NO_BALANCE")).toContain("A sua conta Asaas não tem saldo para este estorno.")
    expect(said("REFUND_NO_BALANCE")).toContain("As taxas da cobrança não voltam")
  })

  it("says a charge Asaas does not let be refunded yet, a refund under way, and one nobody could confirm", () => {
    expect(said("REFUND_NOT_READY")).toContain("O Asaas ainda não deixa estornar esta cobrança")
    expect(said("REFUND_IN_PROGRESS")).toContain("Já existe um estorno deste pagamento em andamento")
    expect(said("REFUND_UNCONFIRMED")).toContain("não deu para confirmar se o estorno foi feito")
    expect(said("PAYMENT_UNAVAILABLE")).toContain("Não foi possível falar com a sua conta Asaas agora")
  })

  it("says how much is left when it asked for more, and that the screen was stale when the API does not say", () => {
    expect(said("REFUND_EXCEEDS", { refundableCents: 3990 })).toBe("O valor passa do que ainda pode ser estornado (R$ 39,90). Confira e tente de novo.")
    expect(said("REFUND_EXCEEDS")).toBe(ptBR.errors.REFUND_STALE)
    expect(said("REFUND_STALE")).toContain("O pagamento mudou desde que esta tela foi aberta")
  })

  it("repeats Asaas's own words for a refusal it has no name for, and says so when Asaas gave none", () => {
    expect(said("REFUND_REFUSED", { reason: " O prazo para estorno desta cobrança expirou. " })).toBe("O Asaas recusou o estorno: O prazo para estorno desta cobrança expirou.")
    expect(said("REFUND_REFUSED", { reason: " " })).toBe(ptBR.errors.REFUND_REFUSED_UNSAID)
    expect(said("REFUND_REFUSED")).toBe(ptBR.errors.REFUND_REFUSED_UNSAID)
  })

  it("falls back to the catch-all rather than showing a code", () => {
    expect(said("SOMETHING_NEW")).toBe(ptBR.errors.UNKNOWN)
    expect(orderRefundRefusalOf(new Error("boom"), ptBR, "pt-BR")).toBe(ptBR.errors.UNKNOWN)
  })
})
