"use client"

// Libs
import { useMutation } from "@tanstack/react-query"

// Types
import type { StorefrontZipCodeLookup } from "@harness-monorepo/ui/blocks/storefront/storefront-address-form"
import type { ZipCodeAddress } from "./cep-requests"

// App
import { CepRequestError, fetchZipCodeAddress } from "./cep-requests"

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
  // Wrapped: the query client hands a mutation function a second argument, which is not a lane.
  const mutation = useMutation({ mutationFn: (zipCode: string) => fetchZipCodeAddress(zipCode) })

  return {
    lookup: (zipCode: string) => mutation.mutateAsync(zipCode).catch(() => null),
    pending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}

/**
 * The shopper's lookup at a shop, for its address form: through the shop's own lane, answered as the
 * form takes it. A postcode that is not one reads as unknown, which the shopper can fix; anything
 * else as the service being down, which they cannot.
 */
export function useShopperZipCodeLookup(slug: string): (zipCode: string) => Promise<StorefrontZipCodeLookup> {
  const mutation = useMutation({ mutationFn: (zipCode: string) => fetchZipCodeAddress(zipCode, `/${slug}/api/cep`) })

  return (zipCode) =>
    mutation.mutateAsync(zipCode).then(
      ({ street, neighborhood, city, state }): StorefrontZipCodeLookup => ({ status: "found", street, neighborhood, city, state }),
      (error: unknown): StorefrontZipCodeLookup =>
        error instanceof CepRequestError && (error.errorCode === "CEP_NOT_FOUND" || error.errorCode === "CEP_INVALID") ? { status: "not-found" } : { status: "unavailable" },
    )
}
