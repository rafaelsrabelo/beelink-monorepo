// Block
import type { AffiliateHomeView, AffiliateOrderView, AffiliatePayoutView, AffiliateProductLinkView, AffiliateProfileFormValues, AffiliateShopCardView } from "@harness-monorepo/ui/lib/affiliate-area"

export const shops: AffiliateShopCardView[] = [
  { key: "loja-da-ana", name: "Loja da Ana", logoUrl: null, href: "/afiliado/loja-da-ana", status: "ACTIVE", available: "R$ 30,00", pending: "R$ 210,00", negative: false },
  { key: "doceria", name: "Doceria Mel", logoUrl: null, href: "/afiliado/doceria", status: "ENDED", available: "−R$ 5,00", pending: "R$ 0,00", negative: true },
]

export const home: AffiliateHomeView = {
  available: "R$ 30,00",
  pending: "R$ 210,00",
  negativeNotice: null,
  next: "30 de nov. · R$ 120,00",
  link: "https://bee-link.com.br/loja-da-ana/maria",
  table: "Tabela Padrão · 10% por venda",
  notice: null,
  numbers: { title: "Últimos 30 dias", visits: "48", orders: "6", sales: "4", commission: "R$ 240,00" },
}

export const pausedHome: AffiliateHomeView = {
  ...home,
  notice: "A loja pausou a sua participação: seus links abrem a loja, mas não contam vendas agora.",
}

export const products: AffiliateProductLinkView[] = [
  { id: "p1", name: "Bolsa de crochê", imageUrl: null, price: "R$ 120,00", rate: "Você ganha 15%", url: "https://bee-link.com.br/loja-da-ana/produtos/bolsa?afiliado=maria" },
  { id: "p2", name: "Chaveiro", imageUrl: null, price: "R$ 20,00", rate: "Você ganha 10%", url: "https://bee-link.com.br/loja-da-ana/produtos/chaveiro?afiliado=maria" },
]

export const orders: AffiliateOrderView[] = [
  {
    key: "12",
    number: "Pedido #12",
    date: "11 de nov.",
    status: "Entregue",
    customer: "Bia Souza",
    items: ["1× Bolsa de crochê"],
    commission: "R$ 18,00",
    base: "Sobre R$ 120,00",
    state: "Vence em 30 de nov.",
    void: false,
  },
  { key: "11", number: "Pedido #11", date: "10 de nov.", status: "Cancelado", customer: "Carla Dias", items: ["2× Chaveiro"], commission: "R$ 4,00", base: "Sobre R$ 40,00", state: "Estornada", void: true },
]

export const payouts: AffiliatePayoutView[] = [{ id: "pay1", amount: "R$ 60,00", detail: "12 de nov. · Pix", note: "Pix de novembro" }]

export const profile: AffiliateProfileFormValues = { pixKey: "maria@pix.test", phone: "(11) 98888-7777", photoUrl: "", tagline: "Separei meus favoritos" }
