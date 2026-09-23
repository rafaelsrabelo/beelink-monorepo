"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type {
  CreateComponentPayload,
  CreateSectionPayload,
  Section,
  StoreComponent,
  UpdateComponentPayload,
  UpdateSectionPayload,
} from "@harness-monorepo/contracts"

// App
import {
  createComponent,
  createSection,
  deleteComponent,
  deleteSection,
  fetchSections,
  reorderComponents,
  reorderSections,
  updateComponent,
  updateSection,
} from "./page-requests"

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
    // The promise is RETURNED, not fired and forgotten, and the screen depends on it: a mutation's
    // own onSuccess is awaited before the one passed to `mutate`, so returning this is what makes
    // the list already hold the new block when the screen opens its form. Drop the `return` — by
    // writing a block body — and adding a block silently opens nothing, because the id would name
    // a component the cache has not fetched yet.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
  })
}

export interface UpdateSectionVariables {
  sectionId: string
  payload: UpdateSectionPayload
}

export function useUpdateSection(slug: string): UseMutationResult<Section, Error, UpdateSectionVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sectionId, payload }: UpdateSectionVariables) => updateSection(slug, sectionId, payload),
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

export interface CreateComponentVariables {
  sectionId: string
  payload: CreateComponentPayload
}

export function useCreateComponent(
  slug: string,
): UseMutationResult<StoreComponent, Error, CreateComponentVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sectionId, payload }: CreateComponentVariables) =>
      createComponent(slug, sectionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
  })
}

export interface UpdateComponentVariables {
  componentId: string
  payload: UpdateComponentPayload
}

export function useUpdateComponent(
  slug: string,
): UseMutationResult<StoreComponent, Error, UpdateComponentVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ componentId, payload }: UpdateComponentVariables) =>
      updateComponent(slug, componentId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
  })
}

export function useDeleteComponent(slug: string): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (componentId: string) => deleteComponent(slug, componentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
  })
}

export interface ReorderComponentsVariables {
  sectionId: string
  ids: string[]
}

export function useReorderComponents(
  slug: string,
): UseMutationResult<Section[], Error, ReorderComponentsVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sectionId, ids }: ReorderComponentsVariables) =>
      reorderComponents(slug, sectionId, { ids }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
  })
}
