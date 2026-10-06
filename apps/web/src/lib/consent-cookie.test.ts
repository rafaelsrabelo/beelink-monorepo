// Libs
import { describe, expect, it } from "vitest"

// App
import { CONSENT_COOKIE, CONSENT_MAX_AGE_SECONDS, consentCookieOf, decodeConsent, marketingAllowed } from "./consent-cookie"

/** BEELINK-271: the answer is one shop's, and nothing but a yes given there is a yes. */
describe("the consent cookie", () => {
  it("reads the two answers and nothing else", () => {
    expect(decodeConsent("granted")).toBe("granted")
    expect(decodeConsent("denied")).toBe("denied")
  })

  it("reads no cookie, or one somebody edited, as not asked yet — never as a yes", () => {
    for (const raw of [undefined, "", "true", "1", "yes", "GRANTED", "granted ", "granted;denied"]) expect(decodeConsent(raw)).toBeNull()
  })

  it("is written on the shop's own path, so a yes at one shop is not sent to another", () => {
    expect(consentCookieOf("loja-a", "granted", false)).toBe(`bl_consent=granted; Path=/loja-a; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`)
    expect(consentCookieOf("loja-b", "denied", true)).toBe(`bl_consent=denied; Path=/loja-b; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax; Secure`)
  })

  it("keeps a refusal exactly as long as a yes: half a year, then the shop asks again", () => {
    expect(CONSENT_MAX_AGE_SECONDS).toBe(180 * 24 * 60 * 60)
    expect(CONSENT_COOKIE).toBe("bl_consent")
  })
})

describe("marketingAllowed", () => {
  const withPixel = { metaPixelId: "123456789012345" }
  const withoutPixel = { metaPixelId: null }

  it("is true only at a shop with a pixel whose visitor said yes", () => {
    expect(marketingAllowed(withPixel, "granted")).toBe(true)
  })

  it("is false while the visitor has not answered, and after a refusal", () => {
    expect(marketingAllowed(withPixel, null)).toBe(false)
    expect(marketingAllowed(withPixel, "denied")).toBe(false)
  })

  it("is false at a shop with no pixel, whatever cookie was left from when it had one", () => {
    expect(marketingAllowed(withoutPixel, "granted")).toBe(false)
  })
})
