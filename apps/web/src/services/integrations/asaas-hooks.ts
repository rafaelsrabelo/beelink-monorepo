"use client"

// React
import { useState } from "react"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { AsaasConnectPayload, AsaasConnection, AsaasSettings, AsaasSettingsPayload } from "@harness-monorepo/contracts"

// App
import { integrationKeys } from "./integration-keys"
import { connectAsaas, disconnectAsaas, fetchAsaasConnection, fetchAsaasSettings, IntegrationError, saveAsaasSettings } from "./integration-requests"

export function useAsaasConnection(slug: string): UseQueryResult<AsaasConnection> {
  return useQuery({ queryKey: integrationKeys.asaasConnection(slug), queryFn: () => fetchAsaasConnection(slug) })
}

/** What came of the last try at connecting, and the way to try. */
export interface AsaasConnect {
  /** Sends the key. It is kept nowhere: the mutation that carried it is dropped the moment it settles. */
  connect: (apiKey: string) => void
  isPending: boolean
  /** The API's code for the last refusal; null before one, and from the next try on. */
  refusal: string | null
  /** The last try connected, and nothing was tried or forgotten since. */
  connected: boolean
  /** Forgets what came of the last try. */
  forget: () => void
}

/**
 * Connects the shop's Asaas with the key its owner pasted, or replaces the key connected. The key is
 * the mutation's variables, and TanStack keeps a mutation — variables and all — for five minutes
 * after it settles, and for as long as its observer holds it: so this one is kept for no time
 * (`gcTime: 0`) and let go of (`reset`) as soon as it ends, whichever way. A key refused for being
 * the other environment's is still a key that holds there.
 *
 * Resetting takes the mutation's own error with it, so what came of the try is kept here instead —
 * as the API's code, and nothing of what was sent. Connected, the connection is read again before
 * the try ends: the list and the catalogue read the same one.
 */
export function useConnectAsaas(slug: string): AsaasConnect {
  const queryClient = useQueryClient()
  const [last, setLast] = useState<"connected" | { refusal: string } | null>(null)
  const { mutate, reset, isPending } = useMutation({
    mutationFn: (payload: AsaasConnectPayload) => connectAsaas(slug, payload),
    gcTime: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.asaasConnection(slug) }),
  })

  function connect(apiKey: string) {
    setLast(null)
    mutate(
      { apiKey },
      {
        onSuccess: () => setLast("connected"),
        onError: (error) => setLast({ refusal: error instanceof IntegrationError ? error.errorCode : "UNKNOWN" }),
        onSettled: () => reset(),
      },
    )
  }

  return { connect, isPending, refusal: last !== null && last !== "connected" ? last.refusal : null, connected: last === "connected", forget: () => setLast(null) }
}

/** Disconnected: the connection is read again. The ways the shop is paid are its own, and stay. */
export function useDisconnectAsaas(slug: string): UseMutationResult<object, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => disconnectAsaas(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.asaasConnection(slug) }),
  })
}

export function useAsaasSettings(slug: string): UseQueryResult<AsaasSettings> {
  return useQuery({ queryKey: integrationKeys.asaasSettings(slug), queryFn: () => fetchAsaasSettings(slug) })
}

/** Saved: the answer is the settings as they now stand, written straight into the cache. */
export function useSaveAsaasSettings(slug: string): UseMutationResult<AsaasSettings, Error, AsaasSettingsPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AsaasSettingsPayload) => saveAsaasSettings(slug, payload),
    onSuccess: (settings) => queryClient.setQueryData(integrationKeys.asaasSettings(slug), settings),
  })
}
