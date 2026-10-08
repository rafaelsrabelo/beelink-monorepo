"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type QueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { CustomDomainOverview, SaveCustomDomainPayload } from "@harness-monorepo/contracts"

// App
import { storeKeys } from "../stores/store-hooks"
import { customDomainKeys } from "./custom-domain-keys"
import { checkCustomDomain, fetchCustomDomain, removeCustomDomain, saveCustomDomain } from "./custom-domain-requests"

/**
 * A read carries no check: only a save and a re-check do, and with one, where the domain's records
 * were found to point. The check kept goes on describing the domain for as long as what is read is
 * the same host, checked at the same instant — a shopkeeper who left for their provider's panel and
 * came back still reads which addresses were found. A later check, here or elsewhere, replaces it.
 */
function withKeptCheck(read: CustomDomainOverview, kept: CustomDomainOverview | undefined): CustomDomainOverview {
  if (read.check || !read.domain || !kept?.check || !kept.domain) return read
  const unchanged = kept.domain.host === read.domain.host && kept.domain.checkedAt === read.domain.checkedAt
  return unchanged ? { ...read, check: kept.check } : read
}

/**
 * The answer of a save or a re-check is the domain as it now stands, written straight into the cache.
 * The shop's own record carries the domain too (`Store.customDomain`), and the panel's home reads it
 * from there: that one is read again.
 */
function keep(queryClient: QueryClient, slug: string, overview: CustomDomainOverview): Promise<void> {
  queryClient.setQueryData(customDomainKeys.overview(slug), overview)
  return queryClient.invalidateQueries({ queryKey: storeKeys.detail(slug) })
}

export function useCustomDomain(slug: string): UseQueryResult<CustomDomainOverview> {
  const queryClient = useQueryClient()
  const queryKey = customDomainKeys.overview(slug)
  return useQuery({ queryKey, queryFn: async () => withKeptCheck(await fetchCustomDomain(slug), queryClient.getQueryData<CustomDomainOverview>(queryKey)) })
}

/** Saves the shop's domain (BEELINK-285). The API checks it there and then, so the answer may already be an active one. */
export function useSaveCustomDomain(slug: string): UseMutationResult<CustomDomainOverview, Error, SaveCustomDomainPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveCustomDomainPayload) => saveCustomDomain(slug, payload),
    onSuccess: (overview) => keep(queryClient, slug, overview),
  })
}

/** Checks the saved domain again, now: a pending one found right comes back active, and an active one found wrong stays active. */
export function useCheckCustomDomain(slug: string): UseMutationResult<CustomDomainOverview, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => checkCustomDomain(slug),
    onSuccess: (overview) => keep(queryClient, slug, overview),
  })
}

/** Removed: the domain is read again, rather than guessed at — the API alone says how a shop with none reads. */
export function useRemoveCustomDomain(slug: string): UseMutationResult<object, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => removeCustomDomain(slug),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: customDomainKeys.overview(slug) }), queryClient.invalidateQueries({ queryKey: storeKeys.detail(slug) })]),
  })
}
