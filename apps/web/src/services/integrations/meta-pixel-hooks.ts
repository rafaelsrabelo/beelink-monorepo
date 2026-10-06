"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { MetaPixelConnectPayload, MetaPixelConnection } from "@harness-monorepo/contracts"

// App
import { integrationKeys } from "./integration-keys"
import { fetchMetaPixelConnection, removeMetaPixel, saveMetaPixel } from "./integration-requests"

export function useMetaPixelConnection(slug: string): UseQueryResult<MetaPixelConnection> {
  return useQuery({ queryKey: integrationKeys.metaPixel(slug), queryFn: () => fetchMetaPixelConnection(slug) })
}

/**
 * Saves the shop's pixel ID, or replaces the one saved (BEELINK-270). The answer is the connection
 * as it now stands, written straight into the cache: the pixel's page and the list read the same one.
 * The ID is no secret, so the mutation is kept as any other — unlike the one that carries an Asaas key.
 */
export function useSaveMetaPixel(slug: string): UseMutationResult<MetaPixelConnection, Error, MetaPixelConnectPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MetaPixelConnectPayload) => saveMetaPixel(slug, payload),
    onSuccess: (connection) => queryClient.setQueryData(integrationKeys.metaPixel(slug), connection),
  })
}

/** Removed: the connection is read again, rather than guessed at — the API alone says how a shop with no pixel reads. */
export function useRemoveMetaPixel(slug: string): UseMutationResult<object, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => removeMetaPixel(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.metaPixel(slug) }),
  })
}
