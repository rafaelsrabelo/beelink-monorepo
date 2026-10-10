"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { CashbackAdjustmentPayload, CashbackOverview, CashbackSettingsPayload, CustomerCashback } from "@harness-monorepo/contracts"

// App
import { cashbackKeys } from "./cashback-keys"
import { adjustCustomerCashback, fetchCashback, fetchCustomerCashback, saveCashback } from "./cashback-requests"

export function useCashback(slug: string): UseQueryResult<CashbackOverview> {
  return useQuery({ queryKey: cashbackKeys.overview(slug), queryFn: () => fetchCashback(slug) })
}

/**
 * Whether the shop gives its cashback product by product, and has it on (BEELINK-313): what makes the
 * products' screens ask each product's rate. False until the rules are read — a field that appears is
 * kinder than one that vanishes.
 */
export function useGivesCashbackByProduct(slug: string): boolean {
  const { data } = useCashback(slug)
  return Boolean(data?.settings.enabled && data.settings.mode === "PRODUCT")
}

/** Saved: the answer is the overview as it now stands, written straight into the cache. */
export function useSaveCashback(slug: string): UseMutationResult<CashbackOverview, Error, CashbackSettingsPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CashbackSettingsPayload) => saveCashback(slug, payload),
    onSuccess: (overview) => queryClient.setQueryData(cashbackKeys.overview(slug), overview),
  })
}

export function useCustomerCashback(slug: string, customerId: string, page: number): UseQueryResult<CustomerCashback> {
  return useQuery({ queryKey: cashbackKeys.customer(slug, customerId, page), queryFn: () => fetchCustomerCashback(slug, customerId, page), placeholderData: (previous) => previous })
}

/**
 * Adjusted: the answer is the statement's first page as it now stands, written into the cache — the
 * screen goes there, and an old first page would show the balance from before for a moment. Every
 * other page and what the shop owes are read again, since both moved.
 */
export function useAdjustCashback(slug: string, customerId: string): UseMutationResult<CustomerCashback, Error, CashbackAdjustmentPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CashbackAdjustmentPayload) => adjustCustomerCashback(slug, customerId, payload),
    onSuccess: (first) => {
      queryClient.setQueryData(cashbackKeys.customer(slug, customerId, 1), first)
      return queryClient.invalidateQueries({ queryKey: cashbackKeys.shop(slug) })
    },
  })
}
