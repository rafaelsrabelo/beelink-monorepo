// Types
import type { AuthSession } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"

/**
 * Three outcomes, because two of them look alike and must not be treated alike: the API refusing
 * the token means the session is over, while the API being unreachable means nothing about it.
 */
export type RefreshOutcome =
  | { status: "renewed"; session: AuthSession }
  | { status: "rejected" }
  | { status: "unavailable" }

/**
 * Spends a refresh token for a new pair. Only src/proxy.ts and the route handlers may call this:
 * a Server Component cannot store the successor, so refreshing during render would burn the token
 * and the next request would look like reuse — which ends the session on purpose.
 */
export async function refreshSession(refreshToken: string, clientIp?: string | null): Promise<RefreshOutcome> {
  let response: Response

  try {
    response = await callApi({ path: "/auth/refresh", body: { refreshToken }, clientIp })
  } catch {
    return { status: "unavailable" }
  }

  if (response.status >= 500) return { status: "unavailable" }
  if (!response.ok) return { status: "rejected" }

  return { status: "renewed", session: (await response.json()) as AuthSession }
}
