// Types
import type { AddressSuggestion } from "@harness-monorepo/contracts"

/**
 * Nothing to suggest is an ordinary answer, so a refused search answers with an empty list rather
 * than throwing. An address box that puts an error under a field while someone is still typing is
 * worse than one that quietly suggests nothing — every field under it can still be filled by hand.
 */
export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const response = await fetch(`/api/addresses/search?q=${encodeURIComponent(query)}`)

  if (!response.ok) return []

  const payload: unknown = await response.json().catch(() => null)

  return Array.isArray(payload) ? (payload as AddressSuggestion[]) : []
}
