"use client"

// Libs
import { useMutation, useQuery, type UseMutationResult } from "@tanstack/react-query"

// Types
import type { CreateRestockRequestPayload, PublicProductCard } from "@harness-monorepo/contracts"

// App
import { searchStorefront, sendRestockRequest } from "./storefront-requests"

/** Below this a shop answers with most of itself, and every keystroke would be a request. */
const MIN_QUERY_LENGTH = 2

/** Long enough for a word to finish, short enough that the list does not feel late. */
const DEBOUNCE_MS = 250

export const storefrontKeys = {
  all: ["storefront"] as const,
  search: (slug: string, term: string) => [...storefrontKeys.all, slug, "search", term] as const,
}

export interface StorefrontSearchHandle {
  products: PublicProductCard[]
  total: number
  pending: boolean
}

/**
 * The same term typed, deleted and typed again is one request, because the answer is cached under
 * it — which is what makes this a query rather than something the component re-runs by hand.
 */
export function useStorefrontSearch(slug: string, term: string): StorefrontSearchHandle {
  const trimmed = term.trim()
  const enabled = trimmed.length >= MIN_QUERY_LENGTH

  const search = useQuery({
    queryKey: storefrontKeys.search(slug, trimmed),
    queryFn: () => searchStorefront(slug, trimmed),
    enabled,
    // A shop's catalogue does not change while someone is typing into it, and re-running on a
    // window focus would spend a request to replace a list with itself.
    staleTime: 5 * 60 * 1000,
  })

  return {
    products: search.data?.products ?? [],
    total: search.data?.total ?? 0,
    // `isFetching` and not `isPending`: a disabled query is pending for ever, which would leave a
    // spinner under the field from the moment it renders.
    pending: enabled && search.isFetching,
  }
}

export { DEBOUNCE_MS, MIN_QUERY_LENGTH }

export interface RestockVariables {
  productId: string
  payload: CreateRestockRequestPayload
}

/** "Avise-me". Nothing is cached from it: a request is not on the shop window. */
export function useRestockRequest(slug: string): UseMutationResult<void, Error, RestockVariables> {
  return useMutation({
    mutationFn: ({ productId, payload }: RestockVariables) => sendRestockRequest(slug, productId, payload),
  })
}
