// Types
import type { AuthSession } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import type { RefreshOutcome } from "./refresh-session"

/**
 * Spends a shopper's refresh token for a new pair, through the shop's door — the panel's refresh
 * refuses it. As with the panel's, only the proxy and route handlers may call this: they can store
 * the successor, and a Server Component cannot.
 */
export async function refreshCustomerSession(slug: string, refreshToken: string, clientIp?: string | null): Promise<RefreshOutcome> {
  let response: Response

  try {
    response = await callApi({ path: `/stores/${encodeURIComponent(slug)}/customer/refresh`, body: { refreshToken }, clientIp })
  } catch {
    return { status: "unavailable" }
  }

  if (response.status >= 500) return { status: "unavailable" }
  if (!response.ok) return { status: "rejected" }

  return { status: "renewed", session: (await response.json()) as AuthSession }
}
