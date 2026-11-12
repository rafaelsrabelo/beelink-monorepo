"use client"

// Libs
import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { CreateAffiliatePayload, ShopAffiliate, ShopAffiliatePage, UpdateAffiliatePayload } from "@harness-monorepo/contracts"

// App
import { affiliateKeys } from "./affiliate-keys"
import { actOnAffiliate, cancelAffiliateInvite, fetchShopAffiliate, fetchShopAffiliates, inviteAffiliate, updateAffiliate, type AffiliateAct, type AffiliateListQuery } from "./affiliate-requests"

/** A page of the list. The last page stays on screen while the next is read: the rows do not blink out. */
export function useShopAffiliates(slug: string, query: AffiliateListQuery): UseQueryResult<ShopAffiliatePage> {
  return useQuery({ queryKey: [...affiliateKeys.list(slug, query.status, query.page), query.pageSize ?? null], queryFn: () => fetchShopAffiliates(slug, query), placeholderData: keepPreviousData })
}

export function useShopAffiliate(slug: string, affiliateId: string): UseQueryResult<ShopAffiliate> {
  return useQuery({ queryKey: affiliateKeys.person(slug, affiliateId), queryFn: () => fetchShopAffiliate(slug, affiliateId) })
}

/**
 * Someone written, changed or gone: the record takes the answer as it is, and the list and the
 * tables' counts — the programme's read — are read again.
 */
function useAffiliateMutation<V>(slug: string, run: (variables: V) => Promise<ShopAffiliate | void>): UseMutationResult<ShopAffiliate | void, Error, V> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (affiliate) => {
      if (affiliate) queryClient.setQueryData(affiliateKeys.person(slug, affiliate.id), affiliate)
      return queryClient.invalidateQueries({ queryKey: affiliateKeys.shop(slug) })
    },
  })
}

export function useInviteAffiliate(slug: string): UseMutationResult<ShopAffiliate | void, Error, CreateAffiliatePayload> {
  return useAffiliateMutation(slug, (payload: CreateAffiliatePayload) => inviteAffiliate(slug, payload))
}

export function useUpdateAffiliate(slug: string, affiliateId: string): UseMutationResult<ShopAffiliate | void, Error, UpdateAffiliatePayload> {
  return useAffiliateMutation(slug, (payload: UpdateAffiliatePayload) => updateAffiliate(slug, affiliateId, payload))
}

export function useActOnAffiliate(slug: string, affiliateId: string): UseMutationResult<ShopAffiliate | void, Error, AffiliateAct> {
  return useAffiliateMutation(slug, (act: AffiliateAct) => actOnAffiliate(slug, affiliateId, act))
}

/**
 * Cancelled, the affiliate is gone. Everything of the shop's is marked stale and nothing is read at
 * once: the record still on screen would ask for someone who no longer exists, and the list reads
 * again when the screen it goes back to mounts.
 */
export function useCancelAffiliateInvite(slug: string, affiliateId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => cancelAffiliateInvite(slug, affiliateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: affiliateKeys.shop(slug), refetchType: "none" }),
  })
}
