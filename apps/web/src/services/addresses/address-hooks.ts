"use client"

// Libs
import { useQuery } from "@tanstack/react-query"

// Types
import type { AddressSuggestion } from "@harness-monorepo/contracts"

// App
import { searchAddresses } from "./address-requests"

/** Below this the API answers nothing anyway, and every keystroke would be a billed request. */
const MIN_QUERY_LENGTH = 3

/**
 * Long enough that a word finishes, short enough that the list does not feel late. The API is
 * rate-limited as well; that limit protects the bill and this one protects the shopkeeper's
 * connection, and neither is a substitute for the other.
 */
const DEBOUNCE_MS = 350

/**
 * What a suggestion costs is what makes this a query and not a mutation: the same three letters
 * typed, deleted and typed again are one request, because the answer is cached under them.
 */
export const addressKeys = {
  all: ["addresses"] as const,
  search: (query: string) => [...addressKeys.all, "search", query] as const,
}

export interface AddressSearchHandle {
  suggestions: AddressSuggestion[]
  pending: boolean
}

export function useAddressSearch(query: string): AddressSearchHandle {
  const trimmed = query.trim()
  const enabled = trimmed.length >= MIN_QUERY_LENGTH

  const search = useQuery({
    queryKey: addressKeys.search(trimmed),
    queryFn: () => searchAddresses(trimmed),
    enabled,
    // The answer for a given string does not change while a form is open, and re-running it on a
    // window focus would spend a request to replace a list with itself.
    staleTime: 10 * 60 * 1000,
  })

  return {
    suggestions: search.data ?? [],
    // `isFetching` and not `isPending`: a disabled query is pending for ever, which would leave a
    // spinner under the field from the moment it renders.
    pending: enabled && search.isFetching,
  }
}

export { DEBOUNCE_MS, MIN_QUERY_LENGTH }
