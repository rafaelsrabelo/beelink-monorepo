"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { BuyOrderLabelPayload, OrderLabelOverview, OrderLabelPrint } from "@harness-monorepo/contracts"

// App
import { buyOrderLabel, cancelOrderLabel, fetchOrderLabel, printOrderLabel } from "./label-requests"
import { orderKeys } from "./order-hooks"

const labelKey = (slug: string, number: number) => [...orderKeys.detail(slug, number), "label"] as const

/**
 * The order's label (BEELINK-187), asked only of an order that goes by carrier. Not retried: the wallet
 * is read from Melhor Envio as it is asked, and a Melhor Envio that did not answer says so at once.
 */
export function useOrderLabel(slug: string, number: number, enabled: boolean): UseQueryResult<OrderLabelOverview> {
  return useQuery({ queryKey: labelKey(slug, number), queryFn: () => fetchOrderLabel(slug, number), enabled, retry: false, staleTime: 0 })
}

/**
 * What a step answers is the label as it now stands; the order is read again, since its delivery
 * record took the tracking. A refusal is read again too: a short wallet left the label in the cart.
 */
function useLabelStep<T>(slug: string, number: number, step: (variables: T) => Promise<OrderLabelOverview>): UseMutationResult<OrderLabelOverview, Error, T> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: step,
    onSuccess: (overview) => {
      queryClient.setQueryData(labelKey(slug, number), overview)
      return queryClient.invalidateQueries({ queryKey: orderKeys.detail(slug, number), exact: true })
    },
    onError: () => queryClient.invalidateQueries({ queryKey: labelKey(slug, number) }),
  })
}

export function useBuyOrderLabel(slug: string, number: number): UseMutationResult<OrderLabelOverview, Error, BuyOrderLabelPayload> {
  return useLabelStep(slug, number, (payload: BuyOrderLabelPayload) => buyOrderLabel(slug, number, payload))
}

export function useCancelOrderLabel(slug: string, number: number): UseMutationResult<OrderLabelOverview, Error, void> {
  return useLabelStep(slug, number, () => cancelOrderLabel(slug, number))
}

export function usePrintOrderLabel(slug: string, number: number): UseMutationResult<OrderLabelPrint, Error, void> {
  return useMutation({ mutationFn: () => printOrderLabel(slug, number) })
}
