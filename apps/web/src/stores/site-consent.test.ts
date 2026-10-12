// Libs
import { afterEach, beforeEach, describe, expect, it } from "vitest"

// App
import { CONSENT_COOKIE } from "@/lib/consent-cookie"
import { decodeSiteConsent, SITE_CONSENT_COOKIE } from "@/lib/site-consent-cookie"
import { createConsentStore } from "./consent"
import { createSiteConsentStore } from "./site-consent"

function cookieNow(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

beforeEach(() => {
  window.history.replaceState(null, "", "/")
})

afterEach(() => {
  document.cookie = `${SITE_CONSENT_COOKIE}=; Path=/; Max-Age=0`
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0`
  document.cookie = `${CONSENT_COOKIE}=; Path=/loja; Max-Age=0`
})

/** BEELINK-319 */
describe("the site's consent store", () => {
  it("asks a visitor who has not answered, and writes no cookie until they do", () => {
    const store = createSiteConsentStore(null)

    expect(store.getState()).toMatchObject({ choice: null, asking: true, answered: false })
    expect(document.cookie).toBe("")
  })

  it("keeps a yes in the site's cookie and stops asking", () => {
    const store = createSiteConsentStore(null)

    store.getState().accept()

    expect(store.getState()).toMatchObject({ choice: "granted", asking: false, answered: true })
    expect(decodeSiteConsent(cookieNow(SITE_CONSENT_COOKIE))).toBe("granted")
  })

  it("keeps a refusal the same way: it is remembered, not asked again at every visit", () => {
    const store = createSiteConsentStore(null)

    store.getState().refuse()

    expect(store.getState()).toMatchObject({ choice: "denied", asking: false, answered: true })
    expect(decodeSiteConsent(cookieNow(SITE_CONSENT_COOKIE))).toBe("denied")
  })

  it("starts from the answer the server read, without asking and without calling it news", () => {
    expect(createSiteConsentStore("granted").getState()).toMatchObject({ choice: "granted", asking: false, answered: false })
    expect(createSiteConsentStore("denied").getState()).toMatchObject({ choice: "denied", asking: false, answered: false })
  })

  it("asks again when the visitor wants to change their mind, and a yes can be taken back", () => {
    const store = createSiteConsentStore("granted")

    store.getState().ask()
    expect(store.getState()).toMatchObject({ choice: "granted", asking: true, answered: false, asks: 1 })

    store.getState().refuse()
    expect(store.getState()).toMatchObject({ choice: "denied", asking: false, answered: true })
    expect(decodeSiteConsent(cookieNow(SITE_CONSENT_COOKIE))).toBe("denied")
  })

  it("is read on every page of the site: the sign-in and the sign-up use the answer the landing was given", () => {
    createSiteConsentStore(null).getState().accept()

    window.history.replaceState(null, "", "/signup")
    expect(decodeSiteConsent(cookieNow(SITE_CONSENT_COOKIE))).toBe("granted")
  })

  it("writes nothing under a shop's name, and a shop's answer writes nothing under the site's", () => {
    createSiteConsentStore(null).getState().accept()
    expect(cookieNow(CONSENT_COOKIE)).toBeUndefined()

    document.cookie = `${SITE_CONSENT_COOKIE}=; Path=/; Max-Age=0`
    window.history.replaceState(null, "", "/loja")
    createConsentStore({ slug: "loja" }, null).getState().accept()

    expect(cookieNow(CONSENT_COOKIE)).toBe("granted")
    expect(cookieNow(SITE_CONSENT_COOKIE)).toBeUndefined()
  })
})
