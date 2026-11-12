// Block
import type {
  AffiliateAdjustmentFormValues,
  AffiliateBalanceView,
  AffiliateOption,
  AffiliateOwedView,
  AffiliatePayoutFormValues,
  AffiliateStatementRowView,
  OrderAffiliateView,
} from "@harness-monorepo/ui/lib/affiliate-money"

export const affiliateOptions: AffiliateOption[] = [
  { id: "a-joao", name: "João Silva" },
  { id: "a-maria", name: "Maria Souza" },
]

export const creditedOrder: OrderAffiliateView = {
  affiliate: { name: "João Silva", href: "/afiliados/a-joao", standing: null },
  commission: { amount: "R$ 22,50", detail: "Tabela Padrão · sobre R$ 150,00", state: "Vence em 30 de nov.", reversed: false, ownPurchase: null },
  changes: [{ key: "c1", at: "12 de nov.", text: "De Maria Souza para João Silva", reason: "Cliente veio pelo João e fechou no WhatsApp" }],
  refundNotice: "R$ 30,00 deste pedido foram estornados. A comissão não muda sozinha: se precisar, ajuste o extrato do afiliado.",
  lockedHint: null,
  action: "Trocar afiliado",
}

export const settledOrder: OrderAffiliateView = {
  ...creditedOrder,
  commission: { ...creditedOrder.commission!, state: "Liberada em 30 de nov." },
  changes: [],
  refundNotice: null,
  lockedHint: "A comissão já foi liberada. Para corrigir, faça um ajuste no extrato do afiliado.",
  action: null,
}

export const uncreditedOrder: OrderAffiliateView = { affiliate: null, commission: null, changes: [], refundNotice: null, lockedHint: null, action: "Atribuir a um afiliado" }

export const balance: AffiliateBalanceView = { available: "R$ 210,00", pending: "R$ 45,00", negativeNotice: null, canPay: true }
export const shortBalance: AffiliateBalanceView = { available: "−R$ 15,00", pending: "R$ 0,00", negativeNotice: "Saldo negativo: o próximo pagamento desconta R$ 15,00.", canPay: false }

export const statementRows: AffiliateStatementRowView[] = [
  { id: "e3", date: "20 de nov.", kind: "Pagamento", amount: "−R$ 200,00", negative: true, detail: "Pago em 20 de nov. · Pix" },
  { id: "e2", date: "18 de nov.", kind: "Ajuste", amount: "−R$ 10,00", negative: true, detail: "Produto devolvido depois do pagamento" },
  { id: "e1", date: "10 de nov.", kind: "Comissão liberada", amount: "+R$ 420,00", negative: false, detail: "Pedido #12" },
]

export const adjustmentValue: AffiliateAdjustmentFormValues = { direction: "debit", amount: "10,00", reason: "Produto devolvido" }
export const payoutValue: AffiliatePayoutFormValues = { amount: "210,00", paidOn: "2026-11-20", method: "PIX", note: "" }

export const owed: AffiliateOwedView = {
  owed: "R$ 630,00",
  upcoming: "R$ 120,00",
  awaiting: "R$ 45,00",
  due: [
    { key: "2026-11-10", label: "Dia 10 de nov.", amount: "R$ 420,00", people: "2 afiliados", state: "OVERDUE", stateLabel: "Atrasado" },
    { key: "2026-11-20", label: "Dia 20 de nov.", amount: "R$ 210,00", people: "1 afiliado", state: "TODAY", stateLabel: "Vence hoje" },
  ],
  upcomingDays: [{ key: "2026-11-30", label: "Dia 30 de nov.", amount: "R$ 120,00", people: "1 afiliado", state: "UPCOMING", stateLabel: "A vencer" }],
  undated: null,
  affiliates: [
    { id: "a-joao", name: "João Silva", href: "/afiliados/a-joao", pixKey: "joao@pix.com", available: "R$ 420,00", pending: "R$ 0,00", overdue: true, short: false },
    { id: "a-maria", name: "Maria Souza", href: "/afiliados/a-maria", pixKey: null, available: "R$ 210,00", pending: "R$ 165,00", overdue: false, short: false },
  ],
}

