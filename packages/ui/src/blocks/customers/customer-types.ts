// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"

/** Where a customer stands with the shop. Mirrors the wire's `CustomerStage`; this package imports no contracts. */
export type CustomerStageValue = "LEAD" | "CUSTOMER" | "INACTIVE"

/** How the list is ordered. Mirrors the wire's `StoreCustomerSort`. */
export type CustomerSortValue = "RECENT" | "LAST_ORDER" | "MOST_ORDERS" | "TOP_SPENT"

export const CUSTOMER_STAGES = ["LEAD", "CUSTOMER", "INACTIVE"] as const satisfies readonly CustomerStageValue[]

export const CUSTOMER_SORTS = ["RECENT", "LAST_ORDER", "MOST_ORDERS", "TOP_SPENT"] as const satisfies readonly CustomerSortValue[]

/** One row of the list: the wire's `StoreCustomer`, as the list reads it. */
export interface CustomerListItem {
  id: string
  name: string
  email: string | null
  emailVerified: boolean
  /** Digits, as stored. Drawn as they are: a mask would have to guess the country. */
  phone: string | null
  city: string | null
  state: string | null
  stage: CustomerStageValue
  ordersCount: number
  totalSpentCents: number
  /** ISO-8601; null with no order. */
  lastOrderAt: string | null
  /** Whole days since the last order, as the API counts them for the stage; null with none. */
  daysSinceLastOrder: number | null
}

/** A customer's record: the wire's `StoreCustomerDetail`, as the record reads it. */
export interface CustomerRecordView extends CustomerListItem {
  /** ISO-8601: when the customer joined the shop's list. */
  createdAt: string
  address: Record<"zipCode" | "street" | "number" | "complement" | "neighborhood" | "city" | "state", string | null>
  /** ISO-8601; null with no valid order. */
  firstOrderAt: string | null
  /** Whole cents, as the API divides them; null with no valid order. */
  averageTicketCents: number | null
}

/** What the table and the cards both draw from, already formatted for the shop's locale. */
export interface CustomerRowsProps {
  customers: readonly CustomerListItem[]
  /** Where a customer's record opens. */
  hrefOf: (id: string) => string
  /** The conversation already typed; null when the customer has no phone. */
  whatsappHrefOf: (customer: CustomerListItem) => string | null
  money: (cents: number) => string
  when: (iso: string) => string
  linkComponent: LinkComponent
  messages: UiMessages
}

/** "São Paulo / SP", either half alone, or null with neither. */
export function placeOf(customer: Pick<CustomerListItem, "city" | "state">): string | null {
  return [customer.city, customer.state].filter(Boolean).join(" / ") || null
}
