"use client"

// Libs
import { useMutation } from "@tanstack/react-query"

// Types
import type { ZipCodeAddress } from "./cep-requests"

// App
import { fetchZipCodeAddress } from "./cep-requests"

export interface ZipCodeLookupHandle {
  /**
   * Resolves with the address, or with `null` when there is none to fill in. It never rejects: the
   * caller is a presentational block's `onZipCodeLookup`, and an unhandled rejection inside a form
   * submit handler would take the form down over a postcode the shopkeeper can still type by hand.
   */
  lookup: (zipCode: string) => Promise<ZipCodeAddress | null>
  pending: boolean
  /** The last refusal, for the screen to turn into a sentence. Cleared by the next attempt. */
  error: Error | null
  reset: () => void
}

/**
 * The postcode lookup as the screens use it. A mutation and not a query: it is asked for by a
 * button press, it has no key worth caching, and its answer is written into a form rather than
 * rendered — re-fetching it on a window focus would silently overwrite what someone was typing.
 */
export function useZipCodeLookup(): ZipCodeLookupHandle {
  const mutation = useMutation({ mutationFn: fetchZipCodeAddress })

  return {
    lookup: (zipCode: string) => mutation.mutateAsync(zipCode).catch(() => null),
    pending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}
