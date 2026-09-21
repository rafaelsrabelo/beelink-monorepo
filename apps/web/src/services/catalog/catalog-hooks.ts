"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type {
  CreateProductCategoryPayload,
  ProductCategory,
  UpdateProductCategoryPayload,
} from "@harness-monorepo/contracts"

// App
import {
  createProductCategory,
  deleteProductCategory,
  fetchProductCategories,
  updateProductCategory,
} from "./catalog-requests"

/**
 * Keys are built from their inputs at call time, never spelled out at a call site
 * (docs/ai-rules/state-and-data.md): invalidating `categories(slug)` reaches exactly one shop's
 * list, and every write below does that rather than patching the cache by hand — the API decides
 * the slug, the position and the counts, and only it knows what the list now is.
 */
export const catalogKeys = {
  all: ["catalog"] as const,
  categories: (slug: string) => [...catalogKeys.all, slug, "categories"] as const,
}

export function useProductCategories(slug: string): UseQueryResult<ProductCategory[], Error> {
  return useQuery({
    queryKey: catalogKeys.categories(slug),
    queryFn: () => fetchProductCategories(slug),
    enabled: slug !== "",
  })
}

export function useCreateProductCategory(
  slug: string,
): UseMutationResult<ProductCategory, Error, CreateProductCategoryPayload> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateProductCategoryPayload) => createProductCategory(slug, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.categories(slug) }),
  })
}

export interface UpdateCategoryVariables {
  categoryId: string
  payload: UpdateProductCategoryPayload
}

export function useUpdateProductCategory(
  slug: string,
): UseMutationResult<ProductCategory, Error, UpdateCategoryVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ categoryId, payload }: UpdateCategoryVariables) =>
      updateProductCategory(slug, categoryId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.categories(slug) }),
  })
}

export function useDeleteProductCategory(slug: string): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryId: string) => deleteProductCategory(slug, categoryId),
    // A parent taking its children with it is a cascade in the database, so the list after a delete
    // is not this list minus one row. Refetching is the only honest way to know what is left.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.categories(slug) }),
  })
}
