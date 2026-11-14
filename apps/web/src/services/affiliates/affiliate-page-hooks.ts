"use client"

// Libs
import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { AffiliateApplicationApproval, AffiliateApplicationStatus, AffiliatePageOverview, AffiliatePagePayload, ShopAffiliateApplication, ShopAffiliateApplicationPage } from "@harness-monorepo/contracts"

// App
import { affiliateKeys } from "./affiliate-keys"
import { decideAffiliateApplication, fetchAffiliateApplications, fetchAffiliatePage, saveAffiliatePage } from "./affiliate-page-requests"

export function useAffiliatePage(slug: string): UseQueryResult<AffiliatePageOverview> {
  return useQuery({ queryKey: affiliateKeys.page(slug), queryFn: () => fetchAffiliatePage(slug) })
}

/** Saved: the answer is the page as it now stands, written straight into the cache. */
export function useSaveAffiliatePage(slug: string): UseMutationResult<AffiliatePageOverview, Error, AffiliatePagePayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AffiliatePagePayload) => saveAffiliatePage(slug, payload),
    onSuccess: (overview) => queryClient.setQueryData(affiliateKeys.page(slug), overview),
  })
}

export function useAffiliateApplications(slug: string, status: AffiliateApplicationStatus, page: number): UseQueryResult<ShopAffiliateApplicationPage> {
  return useQuery({ queryKey: affiliateKeys.applicationList(slug, status, page), queryFn: () => fetchAffiliateApplications(slug, status, page), placeholderData: keepPreviousData })
}

type Decision = { applicationId: string } & ({ act: "approve"; approval: AffiliateApplicationApproval } | { act: "refuse" })

/**
 * An application decided. Every list of them and the page's count are read again; an approval made
 * an affiliate, so the shop's list of them is too.
 */
export function useDecideAffiliateApplication(slug: string): UseMutationResult<ShopAffiliateApplication, Error, Decision> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ applicationId, ...decision }: Decision) => decideAffiliateApplication(slug, applicationId, decision),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: affiliateKeys.applications(slug) }),
        queryClient.invalidateQueries({ queryKey: affiliateKeys.page(slug) }),
        queryClient.invalidateQueries({ queryKey: affiliateKeys.people(slug) }),
      ]),
  })
}
