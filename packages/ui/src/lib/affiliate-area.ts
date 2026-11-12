/**
 * The affiliate's own area as its blocks read it (IMPULSEIA-108): views already in words — amounts,
 * dates and rates formatted by the screen — so a block draws them and never learns the wire's shapes.
 */

/** Where the affiliate stands with a shop, as the badge says it. */
export type AffiliateStandingValue = "ACTIVE" | "PAUSED" | "ENDED"

/** One shop the account sells for, on `/afiliado`. */
export interface AffiliateShopCardView {
  key: string
  name: string
  logoUrl: string | null
  href: string
  status: AffiliateStandingValue
  available: string
  pending: string
  /** The balance is below zero: the next payment is short by it. */
  negative: boolean
}

/** The front page at one shop. */
export interface AffiliateHomeView {
  available: string
  pending: string
  /** Said when the balance is below zero. */
  negativeNotice: string | null
  /** "20 de nov. · R$ 210,00"; null with nothing waiting for a day. */
  next: string | null
  /** The whole address of their link; null once ended. */
  link: string | null
  /** "Tabela Padrão · 10% por venda". */
  table: string
  /** Why the link credits no one now — paused, ended, programme off — or null. */
  notice: string | null
  numbers: { title: string; visits: string; orders: string; sales: string; commission: string }
}

export interface AffiliateProductLinkView {
  id: string
  name: string
  imageUrl: string | null
  price: string
  /** "Você ganha 10%". */
  rate: string
  /** The whole address, ready to copy. */
  url: string
}

export interface AffiliateOrderView {
  key: string
  /** "Pedido #12". */
  number: string
  date: string
  /** The order's own status, in words. */
  status: string
  customer: string
  /** "2× Whey 900 g (Baunilha)". */
  items: string[]
  commission: string
  /** "Sobre R$ 100,00". */
  base: string
  /** "Vence em 30 de nov.", "Aguardando a entrega", "Estornada", or the own purchase's line. */
  state: string
  /** Drawn struck through: it will not be paid. */
  void: boolean
}

export interface AffiliatePayoutView {
  id: string
  amount: string
  /** "12 de nov. · Pix". */
  detail: string
  note: string | null
}

/** Where a list stands: the pager reads it. */
export interface AffiliatePagerView {
  page: number
  pageSize: number
  total: number
}

/** The affiliate's own data, as the form edits it: text, `""` for none. */
export interface AffiliateProfileFormValues {
  pixKey: string
  phone: string
  photoUrl: string
  tagline: string
}
