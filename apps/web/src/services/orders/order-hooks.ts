"use client"

// Libs
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type { CreateOrderPayload, Order, OrderDeliveryPayload, OrderListQuery, OrderPage, OrderQuote, OrderStatus, RefundOrderPayload, ShopOrderQuotePayload } from "@harness-monorepo/contracts"

// App
import { cashbackKeys } from "../cashback/cashback-keys"
import { catalogKeys } from "../catalog/catalog-hooks"
import { customerKeys } from "../customers/customer-hooks"
import { panelCountsKeys } from "../panel/panel-counts-keys"
import { clearOrderDelivery, createOrder, fetchOrder, fetchOrders, markOrderPaymentSeen, quoteOrder, refundOrder, setOrderDelivery, setOrderDeliveryFee, updateOrderStatus } from "./order-requests"

/** Built from their inputs, never spelled at a call site (docs/ai-rules/state-and-data.md). */
export const orderKeys = {
  all: ["orders"] as const,
  store: (slug: string) => [...orderKeys.all, slug] as const,
  lists: (slug: string) => [...orderKeys.store(slug), "list"] as const,
  list: (slug: string, query: OrderListQuery) => [...orderKeys.lists(slug), query] as const,
  detail: (slug: string, number: number) => [...orderKeys.store(slug), "detail", number] as const,
  quote: (slug: string, sale: ShopOrderQuotePayload | null) => [...orderKeys.store(slug), "quote", sale] as const,
}

export function useOrders(slug: string, query: OrderListQuery = {}, options?: { enabled?: boolean; refetchInterval?: number | false }): UseQueryResult<OrderPage, Error> {
  return useQuery({
    queryKey: orderKeys.list(slug, query),
    queryFn: () => fetchOrders(slug, query),
    enabled: slug !== "" && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? false,
    // The page on screen stays while the next one, or the next filter, is on its way.
    placeholderData: (previous) => previous,
  })
}

/** How long a sale's price is trusted: a promotion starts or ends with no write to tell the form. */
const QUOTE_STALE_MS = 30 * 1000

/**
 * The sale being written, as the API would price it (BEELINK-194); null while there is nothing to
 * price. The last price stays on screen while the next is asked — the form's own sum never shows
 * between two answers — and a refusal is not retried: it says a typed amount cannot be.
 */
export function useOrderQuote(slug: string, sale: ShopOrderQuotePayload | null): UseQueryResult<OrderQuote, Error> {
  return useQuery({
    queryKey: orderKeys.quote(slug, sale),
    queryFn: () => quoteOrder(slug, sale!),
    enabled: slug !== "" && sale !== null,
    placeholderData: keepPreviousData,
    staleTime: QUOTE_STALE_MS,
    retry: false,
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
        // A move may take the order into or out of the open ones the menu counts (BEELINK-309) —
        // read here too, not only at the channel's echo, which a panel without the channel never hears.
        queryClient.invalidateQueries({ queryKey: panelCountsKeys.shop(slug) }),
        // A delivery makes its cashback usable, and leaving it or cancelling takes it back (BEELINK-239).
        queryClient.invalidateQueries({ queryKey: cashbackKeys.shop(slug) }),
        // A cancelled order gives its counted lines back to the stock the catalogue shows.
        ...(order.status === "CANCELLED" ? [queryClient.invalidateQueries({ queryKey: catalogKeys.products(slug) })] : []),
      ])
    },
    onError: () => queryClient.invalidateQueries({ queryKey: orderKeys.detail(slug, number) }),
  })
}

/** What the refund's screen sends: the refund, and whether the order is cancelled with it. */
export interface OrderRefundAsked extends RefundOrderPayload {
  cancel?: boolean
}

/**
 * Gives money back from an order (BEELINK-208) — on its own, or as the refund a paid order's
 * cancellation carries. The answer is the whole order, which replaces the one in the cache; the
 * lists read again, and with a cancellation everything a cancelled order touches. A refusal reads
 * the order again: what is left to refund may be what changed.
 */
export function useRefundOrder(slug: string, number: number): UseMutationResult<Order, Error, OrderRefundAsked> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cancel, ...refund }: OrderRefundAsked) =>
      cancel ? updateOrderStatus(slug, number, "CANCELLED", { reason: refund.reason, refundableCents: refund.refundableCents }) : refundOrder(slug, number, refund),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(slug, number), order)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.lists(slug) }),
        ...(order.status === "CANCELLED"
          ? [
              // One open order fewer in the menu (BEELINK-309).
              queryClient.invalidateQueries({ queryKey: panelCountsKeys.shop(slug) }),
              queryClient.invalidateQueries({ queryKey: customerKeys.store(slug) }),
              queryClient.invalidateQueries({ queryKey: cashbackKeys.shop(slug) }),
              queryClient.invalidateQueries({ queryKey: catalogKeys.products(slug) }),
            ]
          : []),
      ])
    },
    onError: () => queryClient.invalidateQueries({ queryKey: orderKeys.detail(slug, number) }),
  })
}

/** A new order changes the shop's list, its customer's books and their cashback; all are read again. */
export function useCreateOrder(slug: string): UseMutationResult<Order, Error, CreateOrderPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(slug, payload),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.store(slug) }),
        queryClient.invalidateQueries({ queryKey: customerKeys.store(slug) }),
        // It starts accepted: one more open order in the menu (BEELINK-309).
        queryClient.invalidateQueries({ queryKey: panelCountsKeys.shop(slug) }),
        // What it will earn is pending on its customer's cashback, and on what the shop owes.
        queryClient.invalidateQueries({ queryKey: cashbackKeys.shop(slug) }),
        // Placing it took its counted lines off the stock the catalogue shows.
        queryClient.invalidateQueries({ queryKey: catalogKeys.products(slug) }),
      ]),
  })
}

/**
 * Tells the fee agreed for a delivery (BEELINK-170): the order on screen is the API's answer, and the
 * list and the customers' books read again — the total both show moved. A refusal reads the order
 * again too: it may have been cancelled in another tab, and the fee card goes with it.
 */
export function useOrderDeliveryFee(slug: string, number: number): UseMutationResult<Order, Error, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (deliveryFeeCents: number) => setOrderDeliveryFee(slug, number, deliveryFeeCents),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(slug, number), order)
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(slug) })
      void queryClient.invalidateQueries({ queryKey: customerKeys.store(slug) })
    },
    onError: () => queryClient.invalidateQueries({ queryKey: orderKeys.detail(slug, number) }),
  })
}

/** Tells how a delivery goes, or takes it back (`null`); the order on screen is the API's answer. */
export function useOrderDelivery(slug: string, number: number): UseMutationResult<Order, Error, OrderDeliveryPayload | null> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (delivery: OrderDeliveryPayload | null) => (delivery ? setOrderDelivery(slug, number, delivery) : clearOrderDelivery(slug, number)),
    onSuccess: (order) => queryClient.setQueryData(orderKeys.detail(slug, number), order),
  })
}

/**
 * Says the shop saw a paid order (BEELINK-207). The order in the cache stops reading as unseen at
 * once — so the screen that asked does not ask again — and the lists are read again: the bell's is
 * one of them.
 */
export function useMarkOrderPaymentSeen(slug: string, number: number): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markOrderPaymentSeen(slug, number),
    onSuccess: () => {
      queryClient.setQueryData<Order>(orderKeys.detail(slug, number), (order) => (order?.payment ? { ...order, payment: { ...order.payment, unseen: false } } : order))
      return queryClient.invalidateQueries({ queryKey: orderKeys.lists(slug) })
    },
  })
}
