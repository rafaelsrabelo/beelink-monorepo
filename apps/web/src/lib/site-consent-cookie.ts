/**
 * What a visitor answered when Beelink's own site asked whether it may measure their visit with its
 * Google Analytics (BEELINK-319), as the `bl_site_consent` cookie holds it.
 *
 * It is not `bl_consent`, and neither ever stands for the other: that one is an answer given to one
 * shop about that shop's ads, this one is given to Beelink about its own pages — the landing, and the
 * sign-in and sign-up screens that read it. Only the name keeps them apart: this cookie is on `/`,
 * so on the platform's host the browser sends it to every shop's pages too, where nothing reads it.
 * Hence a module of its own, which imports nothing of the shop's: a second purpose there gives
 * `bl_consent` a new shape, and this cookie must not change with it.
 *
 * Plain text and not `httpOnly`, for the same reasons as the shop's: the server reads it to draw the
 * page right the first time, and the page writes it at the click. It is an answer the visitor gave,
 * and theirs to change.
 */

export const SITE_CONSENT_COOKIE = "bl_site_consent"

/** One purpose: measuring Beelink's own pages. A second purpose is a new value, not a reuse of these. */
export type SiteConsentChoice = "granted" | "denied"

/**
 * Half a year, for a yes and for a no alike: then the site asks again. The same for both, so that
 * refusing is never the answer that has to be given more often.
 */
export const SITE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

/**
 * The choice a cookie holds, or null for none. A cookie is the visitor's to edit, so anything that
 * is not exactly one of the two answers is "not asked yet" — never a yes.
 */
export function decodeSiteConsent(raw: string | undefined): SiteConsentChoice | null {
  return raw === "granted" || raw === "denied" ? raw : null
}

/**
 * The answer this browser holds right now, out of `document.cookie` (BEELINK-320). A page the router
 * kept may have been drawn for an answer the visitor has since changed — in this tab or in another —
 * and nothing is loaded on the word of a page.
 */
export function siteConsentIn(cookies: string): SiteConsentChoice | null {
  const held = cookies
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${SITE_CONSENT_COOKIE}=`))

  return decodeSiteConsent(held?.slice(SITE_CONSENT_COOKIE.length + 1))
}

/** The `Set-Cookie` a page writes: for the whole site, since the sign-in and the sign-up read the answer the landing was given. */
export function siteConsentCookieOf(choice: SiteConsentChoice, secure: boolean): string {
  return `${SITE_CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${SITE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`
}
