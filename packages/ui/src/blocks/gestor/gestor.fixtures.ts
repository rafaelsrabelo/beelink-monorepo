// Block
import type { CouponListRow } from "../promotions/coupon-list"
import type { GestorCardView, GestorColumns, GestorNavItem } from "./gestor-types"

const card = (number: number, patch: Partial<GestorCardView>): GestorCardView => ({
  number,
  customer: "Ana Paula S.",
  age: "há 3 min.",
  total: "R$ 159,60",
  items: "22 itens",
  fulfillment: "DELIVERY",
  fulfillmentLabel: "Entrega",
  payment: "Pix · Pago",
  paymentTone: "paid",
  href: `?pedido=${number}`,
  ...patch,
})

export const gestorColumns: GestorColumns = {
  NEW: [card(1043, { age: "há 1 min." }), card(1044, { customer: "Eduarda N.", age: "agora", total: "R$ 21,00", items: "3 itens", payment: "Dinheiro", paymentTone: "due", fulfillment: "PICKUP", fulfillmentLabel: "Retirada" })],
  PREPARING: [
    card(1040, { customer: "Carla R.", age: "há 11 min.", total: "R$ 139,80", items: "1 item", payment: "Dinheiro", paymentTone: "due", fulfillment: "PICKUP", fulfillmentLabel: "Retirada" }),
    card(1041, { customer: "Bruno M.", age: "há 6 min.", total: "R$ 47,86", items: "7 itens" }),
  ],
  ON_THE_WAY: [card(1038, { customer: "Diego F.", age: "há 24 min.", total: "R$ 58,20", items: "6 itens" })],
  DONE: [card(1037, { customer: "Fernanda L.", age: "há 1 h", total: "R$ 42,00", items: "4 itens" })],
}

export const gestorEmptyColumns: GestorColumns = { NEW: [], PREPARING: [], ON_THE_WAY: [], DONE: [] }

export const gestorNav: GestorNavItem[] = [
  { key: "orders", href: "/gestor", count: 2 },
  { key: "coupons", href: "/gestor/cupons" },
  { key: "conversations", href: "/gestor/conversas", count: 1 },
]

export const gestorCoupons: CouponListRow[] = [
  { id: "c1", code: "PRIMEIRA10", discount: "10%", minimum: null, period: "Sem data para acabar", uses: "3 usos", status: "ACTIVE", active: true, audience: "FIRST_PURCHASE" },
  { id: "c2", code: "FRETEGRATIS60", discount: "Frete grátis", minimum: "Pedido mínimo de R$ 60,00", period: "Até 30 de nov.", uses: "5 usos", status: "ACTIVE", active: true, audience: "EVERYONE" },
  { id: "c3", code: "KITFESTA15", discount: "R$ 15,00", minimum: null, period: "Até 31 de dez.", uses: "Nenhum uso", status: "PAUSED", active: false, audience: "EVERYONE" },
]
