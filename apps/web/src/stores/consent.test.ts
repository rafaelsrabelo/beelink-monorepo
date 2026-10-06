// Libs
import { afterEach, beforeEach, describe, expect, it } from "vitest"

// App
import { CONSENT_COOKIE, decodeConsent } from "@/lib/consent-cookie"
import { createConsentStore } from "./consent"

function cookieNow(): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1)
}

beforeEach(() => {
  // The cookie is scoped to the shop's path, so the page has to be on it to read it back.
  window.history.replaceState(null, "", "/loja/produtos")
})

afterEach(() => {
  document.cookie = `${CONSENT_COOKIE}=; Path=/loja; Max-Age=0`
  document.cookie = `${CONSENT_COOKIE}=; Path=/outra; Max-Age=0`
})

/** BEELINK-271 */
describe("the consent store", () => {
  it("asks a visitor who has not answered, and writes no cookie until they do", () => {
    const store = createConsentStore("loja", null)

    expect(store.getState()).toMatchObject({ choice: null, asking: true, answered: false })
    expect(cookieNow()).toBeUndefined()
  })

  it("keeps a yes in the shop's cookie and stops asking", () => {
    const store = createConsentStore("loja", null)

    store.getState().accept()

    expect(store.getState()).toMatchObject({ choice: "granted", asking: false, answered: true })
    expect(decodeConsent(cookieNow())).toBe("granted")
  })

  it("keeps a refusal the same way: it is remembered, not asked again at every page", () => {
    const store = createConsentStore("loja", null)

    store.getState().refuse()

    expect(store.getState()).toMatchObject({ choice: "denied", asking: false, answered: true })
    expect(decodeConsent(cookieNow())).toBe("denied")
  })

  it("starts from the answer the server read, without asking and without calling it news", () => {
    expect(createConsentStore("loja", "granted").getState()).toMatchObject({ choice: "granted", asking: false, answered: false })
    expect(createConsentStore("loja", "denied").getState()).toMatchObject({ choice: "denied", asking: false, answered: false })
  })

  it("asks again when the visitor wants to change their mind, and a yes can be taken back", () => {
    const store = createConsentStore("loja", "granted")

    store.getState().ask()
    expect(store.getState()).toMatchObject({ choice: "granted", asking: true })

    store.getState().refuse()
    expect(store.getState()).toMatchObject({ choice: "denied", asking: false })
    expect(decodeConsent(cookieNow())).toBe("denied")
  })

  it("writes on the shop's own path: a yes at another shop is not this page's to read", () => {
    createConsentStore("outra", null).getState().accept()

    // This page is at /loja: the browser does not hand it /outra's cookie.
    expect(cookieNow()).toBeUndefined()
  })
})
