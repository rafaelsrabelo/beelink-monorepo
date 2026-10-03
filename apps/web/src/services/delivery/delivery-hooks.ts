"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { DeliverySettings, DeliverySettingsPayload } from "@harness-monorepo/contracts"

// App
import { deliveryKeys } from "./delivery-keys"
import { fetchDeliverySettings, saveDeliverySettings } from "./delivery-requests"

export function useDeliverySettings(slug: string): UseQueryResult<DeliverySettings> {
  return useQuery({ queryKey: deliveryKeys.settings(slug), queryFn: () => fetchDeliverySettings(slug) })
}

/** Saved: the answer is the rules as they now stand, written straight into the cache. */
export function useSaveDeliverySettings(slug: string): UseMutationResult<DeliverySettings, Error, DeliverySettingsPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DeliverySettingsPayload) => saveDeliverySettings(slug, payload),
    onSuccess: (settings) => queryClient.setQueryData(deliveryKeys.settings(slug), settings),
  })
}
