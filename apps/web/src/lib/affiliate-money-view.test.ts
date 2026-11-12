// Libs
import { describe, expect, it } from "vitest"

// Types
import type { AffiliateOwed, OrderAffiliate } from "@harness-monorepo/contracts"

// UI
import { defaultMessages } from "@harness-monorepo/ui/locales/index"

// App
import { affiliateBalanceViewOf, orderAffiliateViewOf, owedViewOf, signedMoneyOf, statementRowOf } from "./affiliate-money-view"

const text = defaultMessages.affiliates
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
const words = { money, day: (day: string) => `dia ${day.slice(8)}`, date: (iso: string) => iso.slice(0, 10) }

const credited: OrderAffiliate = {
  affiliate: { id: "a1", name: "João Silva", slug: "joao", status: "ACTIVE" },
  commission: { status: "PENDING", baseCents: 15_000, commissionCents: 2250, tableName: "Padrão", zeroReason: null, dueOn: "2026-11-30", availableAt: null },
  changes: [
    { from: { id: "a2", name: "Maria" }, to: { id: "a1", name: "João Silva" }, reason: "Veio pelo João", at: "2026-11-12T10:00:00.000Z" },
    { from: null, to: { id: "a2", name: "Maria" }, reason: "Venda no balcão", at: "2026-11-11T10:00:00.000Z" },
  ],
  refundedCents: 3000,
  changeable: true,
}

describe("an order's affiliate in words (IMPULSEIA-107)", () => {
  it("says the commission, its due day, each change and the money given back", () => {
    const view = orderAffiliateViewOf(credited, { ...words, text, hrefOf: (id) => `/a/${id}` })

    expect(view.affiliate).toEqual({ name: "João Silva", href: "/a/a1", standing: null })
    expect(view.commission).toMatchObject({ amount: "R$ 22,50", detail: "Tabela Padrão · sobre R$ 150,00", state: "Vence em dia 30", reversed: false, ownPurchase: null })
    expect(view.changes.map((change) => change.text)).toEqual(["De Maria para João Silva", "Atribuído a Maria"])
    expect(view.refundNotice).toContain("R$ 30,00 deste pedido foram estornados")
    expect(view.action).toBe("Trocar afiliado")
    expect(view.lockedHint).toBeNull()
  })

  it("waits on the delivery, and says a released one is corrected by an adjustment", () => {
    const awaiting = orderAffiliateViewOf({ ...credited, commission: { ...credited.commission!, dueOn: null } }, { ...words, text, hrefOf: String })
    expect(awaiting.commission!.state).toBe("Aguardando a entrega")

    const released = orderAffiliateViewOf({ ...credited, changeable: false, commission: { ...credited.commission!, status: "AVAILABLE", availableAt: "2026-11-30T03:00:00.000Z" } }, { ...words, text, hrefOf: String })
    expect(released.commission!.state).toBe("Liberada em 2026-11-30")
    expect(released.action).toBeNull()
    expect(released.lockedHint).toContain("ajuste no extrato")
  })

  it("says nothing of a refund on a reversed commission, names a paused affiliate, and an own purchase", () => {
    const view = orderAffiliateViewOf(
      { ...credited, affiliate: { ...credited.affiliate!, status: "PAUSED" }, commission: { ...credited.commission!, status: "REVERSED", zeroReason: "OWN_PURCHASE" }, changes: [{ from: { id: null, name: "Ana" }, to: null, reason: "Erro", at: "2026-11-12T10:00:00.000Z" }] },
      { ...words, text, hrefOf: String },
    )
    expect(view.refundNotice).toBeNull()
    expect(view.affiliate!.standing).toBe("Pausado")
    expect(view.commission).toMatchObject({ state: "Estornada", reversed: true, ownPurchase: text.order.ownPurchase })
    expect(view.changes[0]!.text).toBe("Tirado de Ana")
  })

  it("offers to credit an order credited to nobody", () => {
    expect(orderAffiliateViewOf({ affiliate: null, commission: null, changes: [], refundedCents: 0, changeable: true }, { ...words, text, hrefOf: String }).action).toBe("Atribuir a um afiliado")
  })
})

describe("an affiliate's money in words (IMPULSEIA-107)", () => {
  it("signs a line's amount and says a balance below zero", () => {
    expect(signedMoneyOf(1000, money)).toBe("+R$ 10,00")
    expect(signedMoneyOf(-250, money)).toBe("−R$ 2,50")
    expect(affiliateBalanceViewOf({ availableCents: -1500, pendingCents: 0 }, money, text.money)).toEqual({ available: "−R$ 15,00", pending: "R$ 0,00", negativeNotice: "Saldo negativo: o próximo pagamento desconta R$ 15,00.", canPay: false })
    expect(affiliateBalanceViewOf({ availableCents: 21_000, pendingCents: 4500 }, money, text.money).canPay).toBe(true)
  })

  it("says what each line moved: the order, the reason, or how it was paid", () => {
    const row = (entry: Partial<Parameters<typeof statementRowOf>[0]>) =>
      statementRowOf({ id: "e", kind: "RELEASED", amountCents: 1000, orderNumber: null, reason: null, payout: null, createdAt: "2026-11-20T12:00:00.000Z", ...entry }, { ...words, text: text.money })

    expect(row({ orderNumber: 12 })).toMatchObject({ kind: "Comissão liberada", amount: "+R$ 10,00", detail: "Pedido #12", negative: false })
    expect(row({ kind: "ADJUSTED", amountCents: -100, reason: "Devolução" })).toMatchObject({ kind: "Ajuste", detail: "Devolução", negative: true })
    expect(row({ kind: "PAID_OUT", amountCents: -900, payout: { paidOn: "2026-11-20", method: "PIX", note: "TED" } }).detail).toBe("Pago em dia 20 · Pix · TED")
  })

  it("says what is owed by due day, and each affiliate's part", () => {
    const owed: AffiliateOwed = {
      today: "2026-11-20",
      owedCents: 63_000,
      due: [{ dueOn: "2026-11-10", amountCents: 42_000, affiliateCount: 2, state: "OVERDUE" }],
      undatedCents: 0,
      upcoming: [{ dueOn: "2026-11-30", amountCents: 12_000, affiliateCount: 1, state: "UPCOMING" }],
      awaitingDeliveryCents: 4500,
      affiliates: [{ affiliate: { id: "a1", name: "João", slug: "joao", status: "ACTIVE", pixKey: null }, availableCents: -100, pendingCents: 0, oldestDueOn: null, overdue: false }],
    }
    const view = owedViewOf(owed, { ...words, text: text.owed, hrefOf: (id) => `/a/${id}` })

    expect(view).toMatchObject({ owed: "R$ 630,00", upcoming: "R$ 120,00", awaiting: "R$ 45,00", undated: null })
    expect(view.due[0]).toEqual({ key: "2026-11-10", label: "Dia dia 10", amount: "R$ 420,00", people: "2 afiliados", state: "OVERDUE", stateLabel: "Atrasado" })
    expect(view.upcomingDays[0]!.people).toBe("1 afiliado")
    expect(view.affiliates[0]).toMatchObject({ href: "/a/a1", available: "−R$ 1,00", short: true })
  })
})
