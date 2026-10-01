"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { CustomerFavoriteIds } from "@harness-monorepo/contracts"

// App
import { favoriteKeys } from "./favorite-keys"
import { fetchFavoriteIds, likeFavorite, unlikeFavorite } from "./favorite-requests"

/** No retry: a 401 has already cleared the shopper's cookies on the server, and asking again would only say so again. */
export function useFavoriteIds(slug: string, enabled: boolean): UseQueryResult<CustomerFavoriteIds> {
  return useQuery({ queryKey: favoriteKeys.ids(slug), queryFn: () => fetchFavoriteIds(slug), enabled, retry: false })
}

export interface FavoriteToggle {
  productId: string
  variantId: string | null
  /** What the heart turns into: liked, or not. */
  like: boolean
}

/**
 * The heart turns at the press, on every card of the product at once, and turns back if the shop
 * refuses; the ids are read again afterwards either way, so the page ends as the API says.
 */
export function useToggleFavorite(slug: string): UseMutationResult<void, Error, FavoriteToggle, { before: CustomerFavoriteIds | undefined }> {
  const queryClient = useQueryClient()
  const queryKey = favoriteKeys.ids(slug)

  return useMutation({
    mutationFn: ({ productId, variantId, like }: FavoriteToggle) => (like ? likeFavorite(slug, productId, variantId) : unlikeFavorite(slug, productId)),
    onMutate: async ({ productId, like }) => {
      await queryClient.cancelQueries({ queryKey })
      const before = queryClient.getQueryData<CustomerFavoriteIds>(queryKey)
      const others = (before?.productIds ?? []).filter((id) => id !== productId)
      queryClient.setQueryData<CustomerFavoriteIds>(queryKey, { productIds: like ? [productId, ...others] : others })
      return { before }
    },
    onError: (_error, _toggle, context) => {
      if (context?.before) queryClient.setQueryData(queryKey, context.before)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
