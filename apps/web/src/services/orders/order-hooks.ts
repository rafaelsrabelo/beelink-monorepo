"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type { CreateOrderPayload, Order, OrderListQuery, OrderPage } from "@harness-monorepo/contracts"

// App
import { customerKeys } from "../customers/customer-hooks"
import { createOrder, fetchOrders } from "./order-requests"

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

/** A new order changes the shop's list and its customer's books; both are read again. */
export function useCreateOrder(slug: string): UseMutationResult<Order, Error, CreateOrderPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(slug, payload),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.store(slug) }),
        queryClient.invalidateQueries({ queryKey: customerKeys.store(slug) }),
      ]),
  })
}
