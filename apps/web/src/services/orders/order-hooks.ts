"use client"

// Libs
import { useQuery } from "@tanstack/react-query"
import type { UseQueryResult } from "@tanstack/react-query"

// Types
import type { OrderListQuery, OrderPage } from "@harness-monorepo/contracts"

// App
import { fetchOrders } from "./order-requests"

/** Built from their inputs, never spelled at a call site (docs/ai-rules/state-and-data.md). */
export const orderKeys = {
  all: ["orders"] as const,
  store: (slug: string) => [...orderKeys.all, slug] as const,
  list: (slug: string, query: OrderListQuery) => [...orderKeys.store(slug), "list", query] as const,
}

export function useOrders(slug: string, query: OrderListQuery = {}): UseQueryResult<OrderPage, Error> {
  return useQuery({
    queryKey: orderKeys.list(slug, query),
    queryFn: () => fetchOrders(slug, query),
    enabled: slug !== "",
    // The page on screen stays while the next one, or the next filter, is on its way.
    placeholderData: (previous) => previous,
  })
}
