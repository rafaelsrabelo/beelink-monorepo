"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { MelhorEnvioAccountOverview, MelhorEnvioConnection, MelhorEnvioSettings, MelhorEnvioSettingsPayload } from "@harness-monorepo/contracts"

// App
import { integrationKeys } from "./integration-keys"
import { disconnectMelhorEnvio, fetchMelhorEnvioAccount, fetchMelhorEnvioConnection, fetchMelhorEnvioSettings, saveMelhorEnvioSettings } from "./integration-requests"

export function useMelhorEnvioConnection(slug: string): UseQueryResult<MelhorEnvioConnection> {
  return useQuery({ queryKey: integrationKeys.connection(slug), queryFn: () => fetchMelhorEnvioConnection(slug) })
}

/**
 * The wallet and the services, asked only of a connected shop. Not retried: a Melhor Envio that did
 * not answer says so at once, and the balance is never kept past the page — it changes outside bee-link.
 */
export function useMelhorEnvioAccount(slug: string, connected: boolean): UseQueryResult<MelhorEnvioAccountOverview> {
  return useQuery({ queryKey: integrationKeys.account(slug), queryFn: () => fetchMelhorEnvioAccount(slug), enabled: connected, retry: false, staleTime: 0 })
}

export function useMelhorEnvioSettings(slug: string): UseQueryResult<MelhorEnvioSettings> {
  return useQuery({ queryKey: integrationKeys.settings(slug), queryFn: () => fetchMelhorEnvioSettings(slug) })
}

/** Saved: the answer is the settings as they now stand, written straight into the cache. */
export function useSaveMelhorEnvioSettings(slug: string): UseMutationResult<MelhorEnvioSettings, Error, MelhorEnvioSettingsPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MelhorEnvioSettingsPayload) => saveMelhorEnvioSettings(slug, payload),
    onSuccess: (settings) => queryClient.setQueryData(integrationKeys.settings(slug), settings),
  })
}

/** Disconnected: the connection is read again, and the wallet of the account that left is dropped. */
export function useDisconnectMelhorEnvio(slug: string): UseMutationResult<object, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => disconnectMelhorEnvio(slug),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: integrationKeys.account(slug) })
      return queryClient.invalidateQueries({ queryKey: integrationKeys.connection(slug) })
    },
  })
}
