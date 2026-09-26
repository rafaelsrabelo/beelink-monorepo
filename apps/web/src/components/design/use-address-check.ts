"use client"

// Types
import type { PageAddressState } from "@harness-monorepo/ui/blocks/design/page-address-field"

// App
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { usePageSlugAvailability } from "@/services/page/store-pages-hooks"

/**
 * Whether an address is free, asked a beat after the typing stops: a request per key would be a
 * request per letter of "lancamento". The API normalises what it is sent, so what is asked is what
 * the owner typed — or the page's name, while the address follows it — and the answer is the
 * address as it would be stored.
 */
export function useAddressCheck(slug: string, candidate: string, except?: string): PageAddressState {
  const settled = useDebouncedValue(candidate.trim(), 300)
  const answer = usePageSlugAvailability(slug, settled, except)

  if (!candidate.trim()) return "idle"
  if (settled !== candidate.trim() || answer.isFetching || !answer.data) return answer.isError ? "idle" : "checking"
  if (answer.data.available) return "available"
  return answer.data.reason === "TAKEN" ? "taken" : "invalid"
}
