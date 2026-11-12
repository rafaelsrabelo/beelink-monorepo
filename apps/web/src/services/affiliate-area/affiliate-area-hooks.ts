"use client"

// Libs
import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { AffiliateHome, AffiliateOrderPage, AffiliatePayoutPage, AffiliateProductPage, AffiliateProfile, AffiliateProfilePayload, AffiliateShop, AffiliateStatement } from "@harness-monorepo/contracts"

// App
import { affiliateAreaKeys } from "./affiliate-area-keys"
import {
  fetchAffiliateHome,
  fetchAffiliateOrders,
  fetchAffiliatePayouts,
  fetchAffiliateProducts,
  fetchMyAffiliateShops,
  fetchMyAffiliateStatement,
  saveAffiliateProfile,
} from "./affiliate-area-requests"

/** The shops the account sells for. The panel's account menu asks too, to offer the way in. */
export function useMyAffiliateShops(enabled = true): UseQueryResult<AffiliateShop[]> {
  return useQuery({ queryKey: affiliateAreaKeys.shops(), queryFn: fetchMyAffiliateShops, enabled })
}

export function useAffiliateHome(slug: string): UseQueryResult<AffiliateHome> {
  return useQuery({ queryKey: affiliateAreaKeys.home(slug), queryFn: () => fetchAffiliateHome(slug) })
}

/** A page of the products with their links. The last page stays on screen while the next, or a search, is read. */
export function useAffiliateProducts(slug: string, page: number, q: string, enabled: boolean): UseQueryResult<AffiliateProductPage> {
  return useQuery({ queryKey: affiliateAreaKeys.products(slug, page, q), queryFn: () => fetchAffiliateProducts(slug, page, q), placeholderData: keepPreviousData, enabled })
}

export function useAffiliateOrders(slug: string, page: number): UseQueryResult<AffiliateOrderPage> {
  return useQuery({ queryKey: affiliateAreaKeys.orders(slug, page), queryFn: () => fetchAffiliateOrders(slug, page), placeholderData: keepPreviousData })
}

export function useMyAffiliateStatement(slug: string, page: number): UseQueryResult<AffiliateStatement> {
  return useQuery({ queryKey: affiliateAreaKeys.statement(slug, page), queryFn: () => fetchMyAffiliateStatement(slug, page), placeholderData: keepPreviousData })
}

export function useAffiliatePayouts(slug: string, page: number): UseQueryResult<AffiliatePayoutPage> {
  return useQuery({ queryKey: affiliateAreaKeys.payouts(slug, page), queryFn: () => fetchAffiliatePayouts(slug, page), placeholderData: keepPreviousData })
}

/** Their own data: the front page holds it, and takes the answer as it is. */
export function useSaveAffiliateProfile(slug: string): UseMutationResult<AffiliateProfile, Error, AffiliateProfilePayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AffiliateProfilePayload) => saveAffiliateProfile(slug, payload),
    onSuccess: (profile) => queryClient.setQueryData<AffiliateHome>(affiliateAreaKeys.home(slug), (home) => (home ? { ...home, profile } : home)),
  })
}
