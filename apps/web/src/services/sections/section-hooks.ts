"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type { Section, CreateSectionPayload, UpdateSectionPayload } from "@harness-monorepo/contracts"

// App
import {
  createSection,
  deleteSection,
  fetchSections,
  reorderSections,
  updateSection,
} from "./section-requests"

/**
 * Keys are built from their inputs at call time, never spelled at a call site
 * (docs/ai-rules/state-and-data.md). Every write below invalidates rather than patching the cache:
 * the API decides the position, and only it knows what the list now is.
 */
export const sectionKeys = {
  all: ["sections"] as const,
  list: (slug: string) => [...sectionKeys.all, slug] as const,
}

export function useSections(slug: string): UseQueryResult<Section[], Error> {
  return useQuery({
    queryKey: sectionKeys.list(slug),
    queryFn: () => fetchSections(slug),
    enabled: slug !== "",
  })
}

export function useCreateSection(slug: string): UseMutationResult<Section, Error, CreateSectionPayload> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateSectionPayload) => createSection(slug, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
  })
}

export interface UpdateBannerVariables {
  sectionId: string
  payload: UpdateSectionPayload
}

export function useUpdateSection(slug: string): UseMutationResult<Section, Error, UpdateBannerVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sectionId, payload }: UpdateBannerVariables) => updateSection(slug, sectionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
  })
}

export function useDeleteSection(slug: string): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sectionId: string) => deleteSection(slug, sectionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
  })
}

/**
 * The first client this repository has for a reorder endpoint. The catalogue grew one on the API
 * and in the BFF months ago and never got a request, a hook or a control — so moving a category
 * has never been possible from a screen. The drag ticket inherits this one.
 */
export function useReorderSections(slug: string): UseMutationResult<Section[], Error, string[]> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => reorderSections(slug, { ids }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
  })
}
