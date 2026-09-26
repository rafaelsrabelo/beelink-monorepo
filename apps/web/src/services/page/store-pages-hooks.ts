"use client"

// Libs
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type { CreateLandingPayload, PageSlugAvailability, StorePage, UpdatePagePayload } from "@harness-monorepo/contracts"

// App
import { createPage, fetchPageSlugAvailability, fetchPages, updatePage } from "./store-page-requests"

/** Keys built from their inputs at call time, as `sectionKeys` are (docs/ai-rules/state-and-data.md). */
export const pageKeys = {
  all: ["store-pages"] as const,
  list: (slug: string) => [...pageKeys.all, slug] as const,
  availability: (slug: string, candidate: string, except?: string) =>
    [...pageKeys.all, slug, "availability", candidate, except ?? null] as const,
}

export function usePages(slug: string): UseQueryResult<StorePage[], Error> {
  return useQuery({ queryKey: pageKeys.list(slug), queryFn: () => fetchPages(slug), enabled: slug !== "" })
}

export function useCreatePage(slug: string): UseMutationResult<StorePage, Error, CreateLandingPayload> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateLandingPayload) => createPage(slug, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pageKeys.list(slug) }),
  })
}

export interface UpdatePageVariables {
  pageId: string
  payload: UpdatePagePayload
}

export function useUpdatePage(slug: string): UseMutationResult<StorePage, Error, UpdatePageVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, payload }: UpdatePageVariables) => updatePage(slug, pageId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pageKeys.list(slug) }),
  })
}

/**
 * Whether an address is free, asked only once there is one to ask about. The last answer stays on
 * screen while the next is asked, so "Disponível" does not blink to nothing on every key.
 */
export function usePageSlugAvailability(
  slug: string,
  candidate: string,
  except?: string,
): UseQueryResult<PageSlugAvailability, Error> {
  return useQuery({
    queryKey: pageKeys.availability(slug, candidate, except),
    queryFn: () => fetchPageSlugAvailability(slug, candidate, except),
    enabled: slug !== "" && candidate !== "",
    placeholderData: keepPreviousData,
  })
}
