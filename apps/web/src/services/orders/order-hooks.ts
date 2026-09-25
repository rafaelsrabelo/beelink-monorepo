"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type { CreateOrderPayload, Order, OrderListQuery, OrderPage, OrderStatus } from "@harness-monorepo/contracts"

// App
import { customerKeys } from "../customers/customer-hooks"
import { createOrder, fetchOrder, fetchOrders, updateOrderStatus } from "./order-requests"

/** Built from their inputs, never spelled at a call site (docs/ai-rules/state-and-data.md). */
export const orderKeys = {
  all: ["orders"] as const,
  store: (slug: string) => [...orderKeys.all, slug] as const,
  lists: (slug: string) => [...orderKeys.store(slug), "list"] as const,
  list: (slug: string, query: OrderListQuery) => [...orderKeys.lists(slug), query] as const,
  detail: (slug: string, number: number) => [...orderKeys.store(slug), "detail", number] as const,
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

export function useOrder(slug: string, number: number): UseQueryResult<Order, Error> {
  return useQuery({
    queryKey: orderKeys.detail(slug, number),
    queryFn: () => fetchOrder(slug, number),
    enabled: slug !== "" && number > 0,
    // An order that is not the shop's does not become one on a second try.
    retry: false,
  })
}

/**
 * The answer is the whole order, which replaces the one on screen at once. The lists and the
 * customers are read again: a cancelled order leaves its customer's books.
 *
 * A refusal reads the order again: the API refuses only a move the screen should not have offered —
 * the order was cancelled or moved in another tab — so the screen was stale, and left alone it
 * would keep offering the same refused move next to the error.
 */
export function useUpdateOrderStatus(slug: string, number: number): UseMutationResult<Order, Error, OrderStatus> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(slug, number, status),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(slug, number), order)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.lists(slug) }),
        queryClient.invalidateQueries({ queryKey: customerKeys.store(slug) }),
      ])
    },
    onError: () => queryClient.invalidateQueries({ queryKey: orderKeys.detail(slug, number) }),
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
