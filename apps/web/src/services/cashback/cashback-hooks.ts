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

/** Adjusted: every page of the customer's statement and what the shop owes are read again, since both moved. */
export function useAdjustCashback(slug: string, customerId: string): UseMutationResult<CustomerCashback, Error, CashbackAdjustmentPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CashbackAdjustmentPayload) => adjustCustomerCashback(slug, customerId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cashbackKeys.shop(slug) }),
  })
}
