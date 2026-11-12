"use client"

// Libs
import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { AffiliateAdjustmentPayload, AffiliateOwed, AffiliatePayoutPayload, AffiliateStatement, OrderAffiliate, OrderAffiliatePayload, ShopAffiliate } from "@harness-monorepo/contracts"

// App
import { orderKeys } from "@/services/orders/order-hooks"
import { affiliateKeys } from "./affiliate-keys"
import { adjustAffiliate, changeOrderAffiliate, clearAffiliateShowcase, fetchAffiliateOwed, fetchAffiliateStatement, fetchOrderAffiliate, payAffiliate } from "./affiliate-money-requests"

export function useOrderAffiliate(slug: string, number: number): UseQueryResult<OrderAffiliate> {
  return useQuery({ queryKey: affiliateKeys.order(slug, number), queryFn: () => fetchOrderAffiliate(slug, number) })
}

/** The answer is the order's affiliate as it now stands; the money, the people's balances and the orders list read again. */
export function useChangeOrderAffiliate(slug: string, number: number): UseMutationResult<OrderAffiliate, Error, OrderAffiliatePayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OrderAffiliatePayload) => changeOrderAffiliate(slug, number, payload),
    onSuccess: (read) => {
      queryClient.setQueryData(affiliateKeys.order(slug, number), read)
      void queryClient.invalidateQueries({ queryKey: affiliateKeys.people(slug) })
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(slug) })
      return queryClient.invalidateQueries({ queryKey: affiliateKeys.money(slug) })
    },
  })
}

/** A page of the statement. The last page stays on screen while the next is read. */
export function useAffiliateStatement(slug: string, affiliateId: string, page: number): UseQueryResult<AffiliateStatement> {
  return useQuery({ queryKey: affiliateKeys.statement(slug, affiliateId, page), queryFn: () => fetchAffiliateStatement(slug, affiliateId, page), placeholderData: keepPreviousData })
}

/** An adjustment or a payout: the first page is the answer, and what is owed reads again. */
function useStatementMutation<V>(slug: string, affiliateId: string, run: (variables: V) => Promise<AffiliateStatement>): UseMutationResult<AffiliateStatement, Error, V> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: async (statement) => {
      await queryClient.invalidateQueries({ queryKey: affiliateKeys.money(slug) })
      queryClient.setQueryData(affiliateKeys.statement(slug, affiliateId, 1), statement)
    },
  })
}

export function useAdjustAffiliate(slug: string, affiliateId: string): UseMutationResult<AffiliateStatement, Error, AffiliateAdjustmentPayload> {
  return useStatementMutation(slug, affiliateId, (payload: AffiliateAdjustmentPayload) => adjustAffiliate(slug, affiliateId, payload))
}

export function usePayAffiliate(slug: string, affiliateId: string): UseMutationResult<AffiliateStatement, Error, AffiliatePayoutPayload> {
  return useStatementMutation(slug, affiliateId, (payload: AffiliatePayoutPayload) => payAffiliate(slug, affiliateId, payload))
}

export function useAffiliateOwed(slug: string): UseQueryResult<AffiliateOwed> {
  return useQuery({ queryKey: affiliateKeys.owed(slug), queryFn: () => fetchAffiliateOwed(slug) })
}

/** The photo or the phrase taken off the window; the record takes the answer as it is. */
export function useClearAffiliateShowcase(slug: string, affiliateId: string): UseMutationResult<ShopAffiliate, Error, "photo" | "tagline"> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (field: "photo" | "tagline") => clearAffiliateShowcase(slug, affiliateId, field),
    onSuccess: (affiliate) => queryClient.setQueryData(affiliateKeys.person(slug, affiliate.id), affiliate),
  })
}
