// Types
import type { AddressSuggestion } from "@harness-monorepo/contracts"

/**
 * Nothing to suggest is an ordinary answer, so a refusal — a 429, a 415, a body that is not a list
 * — comes back as an empty list. An address box that puts an error under a field while someone is
 * still typing is worse than one that quietly suggests nothing: every field under it can still be
 * filled by hand.
 *
 * A network that never answered is left to throw, on purpose. That is not an answer, it is the
 * absence of one, and the query around this is what decides whether to try again.
 */
export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const response = await fetch(`/api/addresses/search?q=${encodeURIComponent(query)}`, {
    // Declared on a bodyless read too. `refuseCrossOrigin` answers 415 to a request that does not
    // say it speaks JSON, and that is the whole point of it: a form posted from another site
    // cannot say it without asking for a preflight first, so it never reaches the handler.
    headers: { "content-type": "application/json" },
  })

  if (!response.ok) return []

  const payload: unknown = await response.json().catch(() => null)

  return Array.isArray(payload) ? (payload as AddressSuggestion[]) : []
}
