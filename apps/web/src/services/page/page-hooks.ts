"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type {
  AddComponentPayload,
  CreateSectionPayload,
  MoveComponentPayload,
  Section,
  StoreComponent,
  UpdateComponentPayload,
  UpdateSectionPayload,
} from "@harness-monorepo/contracts"

// App
import {
  createComponent,
  createSectionRow,
  deleteComponent,
  deleteSection,
  fetchSections,
  moveComponent,
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

export interface CreateSectionVariables {
  payload: CreateSectionPayload
  /** How many more of the band's first block go in beside it: a row of banners (`createSectionRow`). */
  alongside?: number
}

export function useCreateSection(slug: string): UseMutationResult<Section, Error, CreateSectionVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ payload, alongside = 0 }: CreateSectionVariables) => createSectionRow(slug, payload, alongside),
    // The promise is RETURNED, not fired and forgotten, and the screen depends on it: a mutation's
    // own callbacks are awaited before the ones passed to `mutate`, so returning this is what makes
    // the list already hold the new block when the screen opens its form. Drop the `return` — by
    // writing a block body — and adding a block silently opens nothing, because the id would name
    // a component the cache has not fetched yet. Settled and not only succeeded: when a banner of a
    // row fails, the band and the others are already written, and the list must show them.
    onSettled: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
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
  payload: AddComponentPayload
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

export interface MoveComponentVariables {
  componentId: string
  payload: MoveComponentPayload
}

export function useMoveComponent(slug: string): UseMutationResult<Section[], Error, MoveComponentVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ componentId, payload }: MoveComponentVariables) => moveComponent(slug, componentId, payload),
    // Returned, so the list is read again before the screen's own `onSuccess` runs — the band the
    // block left may be gone, and a screen still holding its id would open nothing. Settled and not
    // only succeeded: a refusal may be the first news that another tab changed the page.
    onSettled: () => queryClient.invalidateQueries({ queryKey: sectionKeys.list(slug) }),
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
