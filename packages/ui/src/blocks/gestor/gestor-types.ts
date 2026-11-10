// Block
import type { OrderFulfillmentValue } from "../orders/order-types"

/** The board's columns, left to right: what is new, what is being made, what is out, what is done. */
export type GestorColumnKey = "NEW" | "PREPARING" | "ON_THE_WAY" | "DONE"

/** Where a card's money stands, as its pill: paid, still to be paid, or nothing to say. */
export type GestorPaymentTone = "paid" | "due" | "neutral"

/** One order on the board, in the words and amounts the screen already wrote. */
export interface GestorCardView {
  number: number
  customer: string
  /** "há 3 min." — how long since it was placed. */
  age: string
  total: string
  /** "3 itens". */
  items: string
  fulfillment: OrderFulfillmentValue
  /** "Entrega", "Retirada". */
  fulfillmentLabel: string
  /** "Pix · Pago", "Dinheiro". */
  payment: string
  paymentTone: GestorPaymentTone
  /** The order opened beside the board. */
  href: string
}

/** Each column oldest first — the order the counter works in — but the done ones, latest first. */
export type GestorColumns = Readonly<Record<GestorColumnKey, readonly GestorCardView[]>>

/** The manager's three places — and nothing else (plan 2026-11-10--modo-gestor). */
export type GestorNavKey = "orders" | "coupons" | "conversations"

export interface GestorNavItem {
  key: GestorNavKey
  href: string
  /** What waits there — new orders, unread conversations — beside the name; zero shows none. */
  count?: number
}
