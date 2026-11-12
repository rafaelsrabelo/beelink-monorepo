/**
 * The shop's money with its affiliates as the blocks read it (IMPULSEIA-107): views already in words —
 * amounts and dates formatted by the screen — so a block draws them and never learns the wire's shapes.
 */

/** An affiliate a screen offers to credit an order to. */
export interface AffiliateOption {
  id: string
  name: string
}

/** An order's affiliate, as its card shows it. */
export interface OrderAffiliateView {
  /** Null: credited to nobody. */
  affiliate: { name: string; href: string; /** Their standing's word, when they no longer sell; null while active. */ standing: string | null } | null
  commission: {
    amount: string
    /** "Tabela Padrão · sobre R$ 100,00". */
    detail: string
    /** "Vence em 30 de nov.", "Aguardando a entrega", "Estornada". */
    state: string
    reversed: boolean
    /** Said instead of the amount's reason: the affiliate bought it. */
    ownPurchase: string | null
  } | null
  changes: { key: string; at: string; text: string; reason: string }[]
  /** Money given back on the order, which the commission did not follow. */
  refundNotice: string | null
  /** Why whom it is credited to cannot change now. */
  lockedHint: string | null
  /** The way to change it, when it can: its label. */
  action: string | null
}

/** Whom an order is credited to, as the dialog edits it. `""` is nobody. */
export interface OrderAffiliateFormValues {
  affiliateId: string
  reason: string
}

export type OrderAffiliateIssues = Partial<Record<"reason", string>>

/** An affiliate's balances, on their record. */
export interface AffiliateBalanceView {
  available: string
  pending: string
  /** Said when the balance is below zero: what the next payment is short by. */
  negativeNotice: string | null
  /** A payout is offered only with something to pay. */
  canPay: boolean
}

/** One line of the statement, in words. */
export interface AffiliateStatementRowView {
  id: string
  date: string
  kind: string
  /** Signed: "+ R$ 10,00", "− R$ 2,50". */
  amount: string
  negative: boolean
  /** The order, the reason or how it was paid. */
  detail: string | null
}

export interface AffiliateAdjustmentFormValues {
  direction: "credit" | "debit"
  /** Reais, as typed. */
  amount: string
  reason: string
}

export type AffiliateAdjustmentIssues = Partial<Record<"amount" | "reason", string>>

export type AffiliatePayoutMethodValue = "PIX" | "TRANSFER" | "CASH"

export interface AffiliatePayoutFormValues {
  /** Reais, as typed. */
  amount: string
  /** `YYYY-MM-DD`, as the date field gives it. */
  paidOn: string
  method: AffiliatePayoutMethodValue
  note: string
}

export type AffiliatePayoutIssues = Partial<Record<"amount" | "paidOn" | "note", string>>

/** What falls or fell due on one day. */
export interface AffiliateOwedDayView {
  key: string
  label: string
  amount: string
  /** "2 afiliados". */
  people: string
  state: "OVERDUE" | "TODAY" | "UPCOMING"
  stateLabel: string
}

/** One affiliate's part of what is owed. */
export interface AffiliateOwedRowView {
  id: string
  name: string
  href: string
  pixKey: string | null
  available: string
  pending: string
  overdue: boolean
  /** The balance is below zero. */
  short: boolean
}

export interface AffiliateOwedView {
  owed: string
  upcoming: string
  awaiting: string
  due: AffiliateOwedDayView[]
  upcomingDays: AffiliateOwedDayView[]
  /** Owed with no due day; null with none. */
  undated: string | null
  affiliates: AffiliateOwedRowView[]
}

