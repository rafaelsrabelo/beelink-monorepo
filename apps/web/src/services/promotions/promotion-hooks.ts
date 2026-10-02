"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type {
  Coupon,
  CouponListQuery,
  CouponPage,
  CouponPayload,
  CouponRedemptionListQuery,
  CouponRedemptionPage,
  Promotion,
  PromotionListQuery,
  PromotionPage,
  PromotionPayload,
} from "@harness-monorepo/contracts"

// App
import { promotionKeys } from "./promotion-keys"
import {
  createCoupon,
  createPromotion,
  fetchCoupon,
  fetchCouponRedemptions,
  fetchCoupons,
  fetchPromotion,
  fetchPromotions,
  replaceCoupon,
  replacePromotion,
  setCouponActive,
  setPromotionActive,
} from "./promotion-requests"

/** A save: with an id it replaces that one, without it creates one. */
export interface DiscountSave<P> {
  id: string | null
  payload: P
}

export interface DiscountSwitch {
  id: string
  active: boolean
}

export function usePromotions(slug: string, query: PromotionListQuery): UseQueryResult<PromotionPage> {
  return useQuery({ queryKey: promotionKeys.promotionList(slug, query), queryFn: () => fetchPromotions(slug, query), placeholderData: (previous) => previous })
}

/** One promotion, for the page that edits it; an empty id asks nothing, as on the page of a new one. */
export function usePromotion(slug: string, promotionId: string): UseQueryResult<Promotion> {
  return useQuery({
    queryKey: promotionKeys.promotion(slug, promotionId),
    queryFn: () => fetchPromotion(slug, promotionId),
    enabled: promotionId !== "",
    // A promotion that is not the shop's does not become one on a second try.
    retry: false,
  })
}

/**
 * Created or replaced; every page of the list is read again, since the counts and the order moved.
 * The saved one is kept as the API answered it: its page, opened again, seeds its form once from
 * what is cached, and would show what it held before this save.
 */
export function useSavePromotion(slug: string): UseMutationResult<Promotion, Error, DiscountSave<PromotionPayload>> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: DiscountSave<PromotionPayload>) => (id ? replacePromotion(slug, id, payload) : createPromotion(slug, payload)),
    onSuccess: (saved) => {
      queryClient.setQueryData(promotionKeys.promotion(slug, saved.id), saved)
      return queryClient.invalidateQueries({ queryKey: promotionKeys.promotions(slug) })
    },
  })
}

export function useSetPromotionActive(slug: string): UseMutationResult<Promotion, Error, DiscountSwitch> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: DiscountSwitch) => setPromotionActive(slug, id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.promotions(slug) }),
  })
}

export function useCoupons(slug: string, query: CouponListQuery): UseQueryResult<CouponPage> {
  return useQuery({ queryKey: promotionKeys.couponList(slug, query), queryFn: () => fetchCoupons(slug, query), placeholderData: (previous) => previous })
}

/** One coupon, for the page that edits it; an empty id asks nothing, as on the page of a new one. */
export function useCoupon(slug: string, couponId: string): UseQueryResult<Coupon> {
  return useQuery({
    queryKey: promotionKeys.coupon(slug, couponId),
    queryFn: () => fetchCoupon(slug, couponId),
    enabled: couponId !== "",
    // A coupon that is not the shop's does not become one on a second try.
    retry: false,
  })
}

/** As a promotion's save: the list read again, the saved one kept as the API answered it. */
export function useSaveCoupon(slug: string): UseMutationResult<Coupon, Error, DiscountSave<CouponPayload>> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: DiscountSave<CouponPayload>) => (id ? replaceCoupon(slug, id, payload) : createCoupon(slug, payload)),
    onSuccess: (saved) => {
      queryClient.setQueryData(promotionKeys.coupon(slug, saved.id), saved)
      return queryClient.invalidateQueries({ queryKey: promotionKeys.coupons(slug) })
    },
  })
}

export function useSetCouponActive(slug: string): UseMutationResult<Coupon, Error, DiscountSwitch> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: DiscountSwitch) => setCouponActive(slug, id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.coupons(slug) }),
  })
}

/** The orders a coupon went into; asked only while its uses are open (`couponId` null asks nothing). */
export function useCouponRedemptions(slug: string, couponId: string | null, query: CouponRedemptionListQuery): UseQueryResult<CouponRedemptionPage> {
  return useQuery({
    queryKey: promotionKeys.redemptions(slug, couponId ?? "", query),
    queryFn: () => fetchCouponRedemptions(slug, couponId ?? "", query),
    enabled: couponId !== null,
    placeholderData: (previous) => previous,
  })
}
