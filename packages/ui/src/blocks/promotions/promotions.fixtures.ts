import type { CouponFormValues, PromotionFormValues } from "@harness-monorepo/ui/lib/discount-form"

import type { CouponListRow } from "./coupon-list"
import type { CouponRedemptionRow } from "./coupon-redemptions"
import type { PromotionCategoryOption } from "./promotion-category-picker"
import type { PromotionListRow } from "./promotion-list"

export const promotionRows: PromotionListRow[] = [
  { id: "p1", name: "Semana do Consumidor", summary: "10% no carrinho inteiro", period: "De 1 out 2026 a 15 out 2026", status: "ACTIVE", active: true },
  { id: "p2", name: "Proteínas em oferta", summary: "R$ 15,00 por unidade em 2 categorias", period: "Desde 20 out 2026, sem data para acabar", status: "SCHEDULED", active: true },
  { id: "p3", name: "Queima de estoque", summary: "20% em 3 produtos", period: "De 1 set 2026 a 30 set 2026", status: "PAUSED", active: false },
]

export const couponRows: CouponListRow[] = [
  { id: "c1", code: "BEMVINDO10", discount: "10%", minimum: "Pedido mínimo de R$ 50,00", period: "Desde 1 out 2026, sem data para acabar", uses: "3 de 100 usos", status: "ACTIVE", active: true },
  { id: "c2", code: "FRETE-GRATIS", discount: "Frete grátis", minimum: null, period: "De 1 out 2026 a 31 out 2026", uses: "Nenhum uso", status: "PAUSED", active: false },
  { id: "c3", code: "MENOS20", discount: "R$ 20,00", minimum: null, period: "Desde 1 set 2026, sem data para acabar", uses: "50 de 50 usos", status: "EXHAUSTED", active: true },
]

export const redemptionRows: CouponRedemptionRow[] = [
  { id: "u1", orderNumber: 1043, orderHref: "#1043", customerName: "Bia Souza", date: "30 set 2026", discount: "R$ 18,99", cancelled: false },
  { id: "u2", orderNumber: 1040, orderHref: "#1040", customerName: "Caio Lima", date: "29 set 2026", discount: "R$ 9,50", cancelled: true },
]

export const categoryOptions: PromotionCategoryOption[] = [
  { id: "k1", name: "Proteínas", parentId: null },
  { id: "k2", name: "Whey", parentId: "k1" },
  { id: "k3", name: "Acessórios", parentId: null },
]

export const promotionValues: PromotionFormValues = {
  name: "Semana do Consumidor",
  scope: "PRODUCTS",
  kind: "PERCENT",
  percent: "10",
  amount: "",
  startsAt: "2026-10-01T09:00",
  endsAt: "",
  products: [{ id: "w1", name: "Whey Protein Isolado 900g" }],
  categoryIds: [],
}

export const couponValues: CouponFormValues = {
  code: "BEMVINDO10",
  kind: "PERCENT",
  percent: "10",
  amount: "",
  minSubtotal: "50,00",
  startsAt: "2026-10-01T09:00",
  endsAt: "",
  maxUses: "100",
  maxUsesPerCustomer: "1",
}
