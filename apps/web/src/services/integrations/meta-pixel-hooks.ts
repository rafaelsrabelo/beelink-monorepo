"use client"

// React
import { useState } from "react"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { MetaPixelConnectPayload, MetaPixelConnection, MetaPixelTestEventPayload, MetaPixelTestEventResult, MetaPixelTokenPayload } from "@harness-monorepo/contracts"

// App
import { integrationKeys } from "./integration-keys"
import { fetchMetaPixelConnection, IntegrationError, removeMetaPixel, removeMetaPixelToken, saveMetaPixel, saveMetaPixelToken, sendMetaPixelTestEvent } from "./integration-requests"

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

/** What came of the last try at saving a token, and the way to try. */
export interface MetaPixelTokenSave {
  /** Sends the token. It is kept nowhere: the mutation that carried it is dropped the moment it settles. */
  save: (accessToken: string) => void
  isPending: boolean
  /** The API's code for the last refusal; null before one, and from the next try on. */
  refusal: string | null
  /** How many tokens were saved since the page opened: it changes with each one, which is how a form is told its token went. */
  savedCount: number
  /** Forgets what came of the last try. */
  forget: () => void
}

/**
 * Saves the pixel's Conversions API token, or replaces the one saved (BEELINK-274). The token is the
 * mutation's variables, and TanStack keeps a mutation — variables and all — for five minutes after
 * it settles: so this one is kept for no time (`gcTime: 0`) and let go of (`reset`) as soon as it
 * ends, as the one that carries an Asaas key is. What came of the try is kept here instead, as the
 * API's code and nothing of what was sent. The answer never carries the token, so it is written
 * straight into the cache.
 */
export function useSaveMetaPixelToken(slug: string): MetaPixelTokenSave {
  const queryClient = useQueryClient()
  const [refusal, setRefusal] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const { mutate, reset, isPending } = useMutation({
    mutationFn: (payload: MetaPixelTokenPayload) => saveMetaPixelToken(slug, payload),
    gcTime: 0,
    onSuccess: (connection) => queryClient.setQueryData(integrationKeys.metaPixel(slug), connection),
  })

  function save(accessToken: string) {
    setRefusal(null)
    mutate(
      { accessToken },
      {
        onSuccess: () => setSavedCount((count) => count + 1),
        onError: (error) => setRefusal(error instanceof IntegrationError ? error.errorCode : "UNKNOWN"),
        onSettled: () => reset(),
      },
    )
  }

  return { save, isPending, refusal, savedCount, forget: () => setRefusal(null) }
}

/** The token removed: the connection is read again, as when the pixel itself is. */
export function useRemoveMetaPixelToken(slug: string): UseMutationResult<object, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => removeMetaPixelToken(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.metaPixel(slug) }),
  })
}

/**
 * Sends one test event and answers what Meta said. Meta's answer may have changed where the token
 * stands — refused, or taken again — so the connection is read again whatever it was.
 */
export function useSendMetaPixelTestEvent(slug: string): UseMutationResult<MetaPixelTestEventResult, Error, MetaPixelTestEventPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MetaPixelTestEventPayload) => sendMetaPixelTestEvent(slug, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.metaPixel(slug) }),
  })
}
