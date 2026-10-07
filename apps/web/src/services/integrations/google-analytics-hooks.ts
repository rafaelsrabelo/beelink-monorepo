"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { GoogleAnalyticsConnectPayload, GoogleAnalyticsConnection } from "@harness-monorepo/contracts"

// App
import { integrationKeys } from "./integration-keys"
import { fetchGoogleAnalyticsConnection, removeGoogleAnalytics, saveGoogleAnalytics } from "./integration-requests"

export function useGoogleAnalyticsConnection(slug: string): UseQueryResult<GoogleAnalyticsConnection> {
  return useQuery({ queryKey: integrationKeys.googleAnalytics(slug), queryFn: () => fetchGoogleAnalyticsConnection(slug) })
}

/**
 * Saves the shop's measurement ID, or replaces the one saved (BEELINK-302). The answer is the
 * connection as it now stands, written straight into the cache: the integration's page and the list
 * read the same one. The ID is no secret, so the mutation is kept as any other.
 */
export function useSaveGoogleAnalytics(slug: string): UseMutationResult<GoogleAnalyticsConnection, Error, GoogleAnalyticsConnectPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: GoogleAnalyticsConnectPayload) => saveGoogleAnalytics(slug, payload),
    onSuccess: (connection) => queryClient.setQueryData(integrationKeys.googleAnalytics(slug), connection),
  })
}

/** Removed: the connection is read again, rather than guessed at — the API alone says how a shop with no ID reads. */
export function useRemoveGoogleAnalytics(slug: string): UseMutationResult<object, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => removeGoogleAnalytics(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.googleAnalytics(slug) }),
  })
}
