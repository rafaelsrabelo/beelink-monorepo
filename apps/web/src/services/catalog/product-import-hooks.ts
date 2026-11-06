"use client"

// Libs
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult } from "@tanstack/react-query"

// Types
import type { ProductImportExtraction, ProductImportPayload, ProductImportResult } from "@harness-monorepo/contracts"

// App
import { catalogKeys } from "./catalog-hooks"
import { extractProducts, importProducts } from "./product-import-requests"

/**
 * The read is a mutation and not a query: it is asked for once, for a file, it costs money each
 * time, and nothing should ever refetch it on focus. Its drafts live in the answer.
 */
export function useExtractProducts(slug: string): UseMutationResult<ProductImportExtraction, Error, File> {
  return useMutation({ mutationFn: (file: File) => extractProducts(slug, file) })
}

export function useImportProducts(slug: string): UseMutationResult<ProductImportResult, Error, ProductImportPayload> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ProductImportPayload) => importProducts(slug, payload),
    // Both lists, as a single product's creation invalidates them: categories may have been made.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.products(slug) })
      queryClient.invalidateQueries({ queryKey: catalogKeys.categories(slug) })
    },
  })
}
