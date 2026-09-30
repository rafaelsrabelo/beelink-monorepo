"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { StoreReview, StoreReviewListQuery, StoreReviewPage, StoreReviewsUnseen } from "@harness-monorepo/contracts"

// App
import { shopReviewKeys } from "./shop-review-keys"
import { fetchShopReviews, fetchShopReviewsUnseen, markShopReviewsSeen, setShopReviewVisibility } from "./shop-review-requests"

/** No event tells the panel a review arrived: the menu's count is read again every minute, and on coming back to the tab. */
const UNSEEN_EVERY_MS = 60_000

export function useShopReviews(slug: string, query: StoreReviewListQuery): UseQueryResult<StoreReviewPage> {
  return useQuery({ queryKey: shopReviewKeys.list(slug, query), queryFn: () => fetchShopReviews(slug, query), placeholderData: (previous) => previous })
}

export function useShopReviewsUnseen(slug: string, enabled: boolean): UseQueryResult<StoreReviewsUnseen> {
  return useQuery({ queryKey: shopReviewKeys.unseen(slug), queryFn: () => fetchShopReviewsUnseen(slug), enabled, refetchInterval: UNSEEN_EVERY_MS })
}

/** The list opened: what is in it now is seen, and the menu's count goes back to nothing. */
export function useMarkShopReviewsSeen(slug: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markShopReviewsSeen(slug),
    onSuccess: () => queryClient.setQueryData<StoreReviewsUnseen>(shopReviewKeys.unseen(slug), { count: 0 }),
  })
}

export interface ReviewVisibility {
  reviewId: string
  hidden: boolean
}

/** Hidden or published again; every page of the list is read again, since the counts moved. */
export function useSetShopReviewVisibility(slug: string): UseMutationResult<StoreReview, Error, ReviewVisibility> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, hidden }: ReviewVisibility) => setShopReviewVisibility(slug, reviewId, { hidden }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...shopReviewKeys.shop(slug), "list"] }),
  })
}
