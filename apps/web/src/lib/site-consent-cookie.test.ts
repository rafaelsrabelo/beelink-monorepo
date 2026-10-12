// Libs
import { describe, expect, it } from "vitest"

// App
import { CONSENT_COOKIE } from "./consent-cookie"
import { decodeSiteConsent, SITE_CONSENT_COOKIE, SITE_CONSENT_MAX_AGE_SECONDS, siteConsentCookieOf } from "./site-consent-cookie"

/** BEELINK-319: the answer is the site's, kept under a name of its own, and nothing but a yes is a yes. */
describe("the site's consent cookie", () => {
  it("reads the two answers and nothing else", () => {
    expect(decodeSiteConsent("granted")).toBe("granted")
    expect(decodeSiteConsent("denied")).toBe("denied")
  })

  it("reads no cookie, or one somebody edited, as not asked yet — never as a yes", () => {
    for (const raw of [undefined, "", "true", "1", "yes", "GRANTED", "granted ", "granted;denied"]) expect(decodeSiteConsent(raw)).toBeNull()
  })

  it("is written for the whole site, where the sign-in and the sign-up read it, and over https alone on https", () => {
    expect(siteConsentCookieOf("granted", false)).toBe(`bl_site_consent=granted; Path=/; Max-Age=${SITE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`)
    expect(siteConsentCookieOf("denied", true)).toBe(`bl_site_consent=denied; Path=/; Max-Age=${SITE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax; Secure`)
  })

  it("keeps a refusal exactly as long as a yes: half a year, then the site asks again", () => {
    expect(SITE_CONSENT_MAX_AGE_SECONDS).toBe(180 * 24 * 60 * 60)
  })

  // The policy names the cookie and its 180 days; a change here is a new version of that text.
  it("lasts what the privacy policy says it lasts", async () => {
    const { legalTexts } = await import("@/locales/legal/pt-BR")
    const policy = JSON.stringify(legalTexts.privacy)

    expect(policy).toContain(`${SITE_CONSENT_COOKIE}: a sua resposta`)
    expect(policy).toContain(`nunca como resposta ao aviso de uma loja, e dura ${SITE_CONSENT_MAX_AGE_SECONDS / 86_400} dias`)
    expect(policy).toContain(`no cookie ${SITE_CONSENT_COOKIE}, e o bee-link pergunta de novo depois de ${SITE_CONSENT_MAX_AGE_SECONDS / 86_400} dias`)
  })

  // On the platform's host this cookie is sent to every shop's pages: the name is all that keeps the two answers apart.
  it("is not a shop's cookie under another path: it has a name of its own, which neither begins the other's", () => {
    expect(SITE_CONSENT_COOKIE).toBe("bl_site_consent")
    expect(SITE_CONSENT_COOKIE).not.toBe(CONSENT_COOKIE)
    expect(siteConsentCookieOf("granted", false).startsWith(`${CONSENT_COOKIE}=`)).toBe(false)
  })
})
