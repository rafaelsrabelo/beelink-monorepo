"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { StorePopupOverview, StorePopupPayload } from "@harness-monorepo/contracts"

// App
import { fetchPopup, savePopup } from "./popup-requests"
import { promotionKeys } from "./promotion-keys"

export function usePopup(slug: string): UseQueryResult<StorePopupOverview> {
  return useQuery({ queryKey: promotionKeys.popup(slug), queryFn: () => fetchPopup(slug) })
}

/** Saved: the answer is the pop-up as it now stands — its revision and what it announces — written straight into the cache. */
export function useSavePopup(slug: string): UseMutationResult<StorePopupOverview, Error, StorePopupPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: StorePopupPayload) => savePopup(slug, payload),
    onSuccess: (overview) => queryClient.setQueryData(promotionKeys.popup(slug), overview),
  })
}
