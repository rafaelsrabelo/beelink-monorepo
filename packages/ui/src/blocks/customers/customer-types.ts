/** Where a customer stands with the shop. Mirrors the wire's `CustomerStage`; this package imports no contracts. */
export type CustomerStageValue = "LEAD" | "CUSTOMER" | "INACTIVE"

/** How the list is ordered. Mirrors the wire's `StoreCustomerSort`. */
export type CustomerSortValue = "RECENT" | "LAST_ORDER" | "MOST_ORDERS" | "TOP_SPENT"

export const CUSTOMER_STAGES = ["LEAD", "CUSTOMER", "INACTIVE"] as const satisfies readonly CustomerStageValue[]

export const CUSTOMER_SORTS = ["RECENT", "LAST_ORDER", "MOST_ORDERS", "TOP_SPENT"] as const satisfies readonly CustomerSortValue[]
