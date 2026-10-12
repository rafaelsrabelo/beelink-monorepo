import "server-only"

// Next
import { cookies } from "next/headers"

// App
import { decodeSiteConsent, SITE_CONSENT_COOKIE, type SiteConsentChoice } from "./site-consent-cookie"

/**
 * What this visitor answered Beelink's own site about being measured, or null (BEELINK-319). It
 * reads `bl_site_consent` and nothing else: a shop's `bl_consent` beside it is an answer to that
 * shop, and is never one to this question.
 *
 * Read per request and never part of a kept answer. An answer alone loads nothing: with no
 * measurement ID configured (`serverEnv.SITE_GA_MEASUREMENT_ID`) there is nothing to load, whatever
 * a cookie left from when there was one says.
 */
export async function siteConsentAt(): Promise<SiteConsentChoice | null> {
  return decodeSiteConsent((await cookies()).get(SITE_CONSENT_COOKIE)?.value)
}
