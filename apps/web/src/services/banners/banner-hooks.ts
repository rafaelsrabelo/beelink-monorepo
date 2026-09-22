"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type { Banner, CreateBannerPayload, UpdateBannerPayload } from "@harness-monorepo/contracts"

// App
import {
  createBanner,
  deleteBanner,
  fetchBanners,
  reorderBanners,
  updateBanner,
} from "./banner-requests"

/**
 * Keys are built from their inputs at call time, never spelled at a call site
 * (docs/ai-rules/state-and-data.md). Every write below invalidates rather than patching the cache:
 * the API decides the position, and only it knows what the list now is.
 */
export const bannerKeys = {
  all: ["banners"] as const,
  list: (slug: string) => [...bannerKeys.all, slug] as const,
}

export function useBanners(slug: string): UseQueryResult<Banner[], Error> {
  return useQuery({
    queryKey: bannerKeys.list(slug),
    queryFn: () => fetchBanners(slug),
    enabled: slug !== "",
  })
}

export function useCreateBanner(slug: string): UseMutationResult<Banner, Error, CreateBannerPayload> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateBannerPayload) => createBanner(slug, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.list(slug) }),
  })
}

export interface UpdateBannerVariables {
  bannerId: string
  payload: UpdateBannerPayload
}

export function useUpdateBanner(slug: string): UseMutationResult<Banner, Error, UpdateBannerVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ bannerId, payload }: UpdateBannerVariables) => updateBanner(slug, bannerId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.list(slug) }),
  })
}

export function useDeleteBanner(slug: string): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bannerId: string) => deleteBanner(slug, bannerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.list(slug) }),
  })
}

/**
 * The first client this repository has for a reorder endpoint. The catalogue grew one on the API
 * and in the BFF months ago and never got a request, a hook or a control — so moving a category
 * has never been possible from a screen. The drag ticket inherits this one.
 */
export function useReorderBanners(slug: string): UseMutationResult<Banner[], Error, string[]> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => reorderBanners(slug, { ids }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.list(slug) }),
  })
}
