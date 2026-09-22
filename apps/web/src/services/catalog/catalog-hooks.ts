"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type {
  CreateProductCategoryPayload,
  CreateProductPayload,
  Product,
  ProductCategory,
  ProductListQuery,
  ProductPage,
  UpdateProductCategoryPayload,
  UpdateProductPayload,
} from "@harness-monorepo/contracts"

// App
import {
  createProduct,
  createProductCategory,
  deleteProduct,
  deleteProductCategory,
  fetchProduct,
  fetchProductCategories,
  fetchProducts,
  updateProduct,
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
  products: (slug: string) => [...catalogKeys.all, slug, "products"] as const,
  /**
   * One filtered page. It nests under `products(slug)`, so every write below still invalidates it
   * by prefix without knowing which filters happen to be on screen.
   */
  productList: (slug: string, query: ProductListQuery) =>
    [...catalogKeys.products(slug), "list", query] as const,
  product: (slug: string, productId: string) =>
    [...catalogKeys.products(slug), productId] as const,
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

/**
 * One page of the shop's products, filtered as the screen asks.
 *
 * The query is part of the key, so changing a filter is a different query rather than a refetch of
 * the same one — which is what lets TanStack serve a page already seen instantly while the new one
 * loads. `placeholderData` keeps the previous page on screen while the next arrives: without it the
 * table empties and the pager jumps on every keystroke of the search box.
 */
export function useProducts(
  slug: string,
  query: ProductListQuery = {},
): UseQueryResult<ProductPage, Error> {
  return useQuery({
    queryKey: catalogKeys.productList(slug, query),
    queryFn: () => fetchProducts(slug, query),
    enabled: slug !== "",
    placeholderData: (previous) => previous,
  })
}

/**
 * One product, for the page that edits it. `enabled` is false while there is no id — the same
 * screen serves "new", and a query for an empty id would be a request for nothing.
 */
export function useProduct(
  slug: string,
  productId: string,
  options?: { enabled?: boolean },
): UseQueryResult<Product, Error> {
  return useQuery({
    queryKey: catalogKeys.product(slug, productId),
    queryFn: () => fetchProduct(slug, productId),
    enabled: options?.enabled ?? Boolean(productId),
  })
}

export function useCreateProduct(slug: string): UseMutationResult<Product, Error, CreateProductPayload> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(slug, payload),
    // Both lists: a product landing in a category changes that category's count, and the
    // categories screen reads it. Two keys is cheaper than one screen that quietly lies.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.products(slug) })
      queryClient.invalidateQueries({ queryKey: catalogKeys.categories(slug) })
    },
  })
}

export interface UpdateProductVariables {
  productId: string
  payload: UpdateProductPayload
}

export function useUpdateProduct(slug: string): UseMutationResult<Product, Error, UpdateProductVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, payload }: UpdateProductVariables) => updateProduct(slug, productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.products(slug) })
      queryClient.invalidateQueries({ queryKey: catalogKeys.categories(slug) })
    },
  })
}

export function useDeleteProduct(slug: string): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productId: string) => deleteProduct(slug, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.products(slug) })
      queryClient.invalidateQueries({ queryKey: catalogKeys.categories(slug) })
    },
  })
}
