import "server-only"

// Next
import { cookies } from "next/headers"

// App
import { CONSENT_COOKIE, decodeConsent, type ConsentChoice } from "./consent-cookie"

/**
 * What this visitor answered at the shop this request is for, or null. The cookie is scoped to
 * `/<slug>`, so the browser only sends a shop's own: nothing here has to pick one out.
 *
 * Read per request, like the cart, and never part of a kept answer: no public read is keyed by it.
 * Pair it with `marketingAllowed(store, …)` — a choice alone says nothing of a shop with no pixel.
 */
export async function consentAt(): Promise<ConsentChoice | null> {
  return decodeConsent((await cookies()).get(CONSENT_COOKIE)?.value)
}
