// Next
import type { NextRequest } from "next/server"

// Types
import type { AuthSession } from "@harness-monorepo/contracts"

// App
import { clientIpOf } from "./bff"
import { CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE } from "./customer-session-cookies"
import { refreshCustomerSession } from "./refresh-customer-session"

/** What a call as the shopper came to: the API's answer, with the pair renewed on the way; or no session left. */
export type ShopperCall = { status: "answered"; response: Response | null; renewed: AuthSession | null } | { status: "signedOut" }

/**
 * A call to the API as the shop's signed-in shopper, from a handler under `/<slug>`, where their
 * cookies reach. The proxy renews a session whose access cookie is gone before a page runs; a token
 * that ran out in between is renewed here — once — and the new pair handed back for the answer to
 * store. `response` is null when the API could not be reached.
 */
export async function callAsShopper(
  request: NextRequest,
  slug: string,
  call: (accessToken: string) => Promise<Response | null>,
): Promise<ShopperCall> {
  const response = await call(request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value ?? "")
  if (response?.status !== 401) return { status: "answered", response, renewed: null }

  const refreshToken = request.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value
  const outcome = refreshToken ? await refreshCustomerSession(slug, refreshToken, clientIpOf(request)) : { status: "rejected" as const }
  if (outcome.status !== "renewed") return { status: "signedOut" }

  return { status: "answered", response: await call(outcome.session.accessToken), renewed: outcome.session }
}
