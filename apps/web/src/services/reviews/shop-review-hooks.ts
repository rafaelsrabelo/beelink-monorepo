"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { MarkReviewsSeenPayload, StoreReview, StoreReviewListQuery, StoreReviewPage, StoreReviewsUnseen } from "@harness-monorepo/contracts"

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

/**
 * The owner saw the list up to its newest review; the menu's count is read again. Invalidated, not
 * set to nothing: a read of it already in flight began before the mark, and would land over a zero.
 */
export function useMarkShopReviewsSeen(slug: string): UseMutationResult<void, Error, MarkReviewsSeenPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MarkReviewsSeenPayload) => markShopReviewsSeen(slug, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopReviewKeys.unseen(slug) }),
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
