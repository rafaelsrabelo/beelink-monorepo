// Node
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Libs
import { afterEach, describe, expect, it } from "vitest"

// App
import {
  forgetGoogleAnalyticsCookies,
  googleAnalyticsCookieExpiries,
  googleAnalyticsSrc,
  sendToGoogleAnalytics,
  shutGoogleAnalytics,
  startGoogleAnalytics,
  stopGoogleAnalytics,
} from "./google-analytics"

const SITE = "G-TEST000000"
const SHOP = "G-SHOP111111"
const HOME = { page_location: "http://localhost:3000/" }
const SIGNUP = { page_location: "http://localhost:3000/signup" }
const SETTINGS = { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false }

/** What the library would find waiting: with none loaded, every call stays in the queue, in order. */
const calls = () => (window.dataLayer ?? []).map((call) => Array.from(call as ArrayLike<unknown>))
const commands = () => calls().map(([command]) => command)
const events = () => calls().filter(([command]) => command === "event")
const lock = (measurementId: string) => window[`ga-disable-${measurementId}`]

afterEach(() => {
  delete window.dataLayer
  for (const measurementId of [SITE, SHOP]) delete window[`ga-disable-${measurementId}`]
  for (const name of ["_ga", "_ga_TEST000000", "_ga_OLD1234567", "_gat", "bl_site_consent"]) document.cookie = `${name}=; Path=/; Max-Age=0`
})

describe("Google's tag library, as Beelink's own site drives it", () => {
  it("creates nothing until an ID is started: no queue, no lock, whatever else is asked", () => {
    shutGoogleAnalytics()
    shutGoogleAnalytics(SITE)
    stopGoogleAnalytics(SITE)
    expect(sendToGoogleAnalytics(SITE, { name: "page_view", params: HOME })).toBe(false)

    expect(window.dataLayer).toBeUndefined()
    expect(lock(SITE)).toBeUndefined()
  })

  it("starts with every storage refused, then grants measurement alone, before the library is told anything else", () => {
    startGoogleAnalytics(SITE, HOME)

    expect(calls()).toEqual([
      [
        "consent",
        "default",
        {
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          analytics_storage: "denied",
          functionality_storage: "denied",
          personalization_storage: "denied",
          security_storage: "denied",
        },
      ],
      ["js", expect.any(Date)],
      ["consent", "update", { analytics_storage: "granted" }],
      ["config", SITE, { ...SETTINGS, ...HOME }],
    ])
  })

  // The library reads a command only as an `arguments` object: an array in the queue is data, and is never acted on.
  it("queues every call the way Google's snippet does, as an arguments object", () => {
    startGoogleAnalytics(SITE, HOME)
    sendToGoogleAnalytics(SITE, { name: "page_view", params: HOME })

    for (const call of window.dataLayer ?? []) expect(Object.prototype.toString.call(call)).toBe("[object Arguments]")
  })

  it("sends no page view of the library's own, links nothing to an ad profile, and hands over nothing of the visitor", () => {
    startGoogleAnalytics(SITE, HOME)

    const [, , settings] = calls().find(([command]) => command === "config") ?? []
    // Exactly these, so nothing of a person — an identifier, an address to match — can ride along.
    expect(settings).toEqual({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: "http://localhost:3000/" })
  })

  it("grants measurement once, and tells the library the page's address at every arrival", () => {
    startGoogleAnalytics(SITE, HOME)
    startGoogleAnalytics(SITE, SIGNUP)

    expect(commands()).toEqual(["consent", "js", "consent", "config", "config"])
    expect(calls().at(-1)).toEqual(["config", SITE, { ...SETTINGS, ...SIGNUP }])
  })

  it("addresses every event to one measurement ID, with the page it happened on", () => {
    startGoogleAnalytics(SITE, HOME)

    expect(sendToGoogleAnalytics(SITE, { name: "page_view", params: { ...HOME, page_referrer: "https://www.instagram.com/", page_title: "Beelink" } })).toBe(true)
    expect(events()).toEqual([["event", "page_view", { page_location: "http://localhost:3000/", page_referrer: "https://www.instagram.com/", page_title: "Beelink", send_to: SITE }]])
  })

  it("never sends to the IDs on the page: with two of them open, each event names its own", () => {
    startGoogleAnalytics(SITE, HOME)
    startGoogleAnalytics(SHOP, HOME)
    sendToGoogleAnalytics(SITE, { name: "sign_up", params: SIGNUP })
    sendToGoogleAnalytics(SHOP, { name: "page_view", params: HOME })

    expect(events().map(([, name, params]) => [name, (params as { send_to?: string }).send_to])).toEqual([
      ["sign_up", SITE],
      ["page_view", SHOP],
    ])
  })

  it("sends nothing to an ID that was never started, even with another one open", () => {
    startGoogleAnalytics(SITE, HOME)

    expect(sendToGoogleAnalytics(SHOP, { name: "page_view", params: HOME })).toBe(false)
    expect(events()).toEqual([])
    expect(lock(SHOP)).toBeUndefined()
  })
})

describe("Google's tag library, shut and stopped", () => {
  it("opens an ID's lock at a start and shuts it when the page is left, dropping what is asked meanwhile", () => {
    startGoogleAnalytics(SITE, HOME)
    expect(lock(SITE)).toBe(false)

    shutGoogleAnalytics(SITE)

    expect(lock(SITE)).toBe(true)
    expect(sendToGoogleAnalytics(SITE, { name: "page_view", params: HOME })).toBe(false)
    expect(events()).toEqual([])
    // Leaving a page is not a no: the library is told nothing about consent.
    expect(commands().filter((command) => command === "consent")).toHaveLength(2)
  })

  it("shuts every ID the tab opened when a navigation begins, and no other", () => {
    startGoogleAnalytics(SITE, HOME)
    startGoogleAnalytics(SHOP, HOME)

    shutGoogleAnalytics()

    expect(lock(SITE)).toBe(true)
    expect(lock(SHOP)).toBe(true)
    expect(Object.keys(window).filter((key) => key.startsWith("ga-disable-")).sort()).toEqual([`ga-disable-${SHOP}`, `ga-disable-${SITE}`])
  })

  it("opens again on arriving at a measured page, and what is sent then is sent", () => {
    startGoogleAnalytics(SITE, HOME)
    shutGoogleAnalytics()
    startGoogleAnalytics(SITE, SIGNUP)

    expect(lock(SITE)).toBe(false)
    expect(sendToGoogleAnalytics(SITE, { name: "page_view", params: SIGNUP })).toBe(true)
    expect(events()).toHaveLength(1)
  })

  it("at a yes taken back, shuts the ID and tells the library measurement is refused, once", () => {
    startGoogleAnalytics(SITE, HOME)

    stopGoogleAnalytics(SITE)
    stopGoogleAnalytics(SITE)

    expect(lock(SITE)).toBe(true)
    expect(calls().slice(4)).toEqual([["consent", "update", { analytics_storage: "denied" }]])
    expect(sendToGoogleAnalytics(SITE, { name: "sign_up", params: SIGNUP })).toBe(false)
  })

  it("grants measurement again at a yes given again, and sends from there on", () => {
    startGoogleAnalytics(SITE, HOME)
    stopGoogleAnalytics(SITE)
    startGoogleAnalytics(SITE, HOME)

    expect(calls().slice(4).map(([command, action]) => `${command} ${action}`)).toEqual(["consent update", "consent update", `config ${SITE}`])
    expect(calls().at(-2)).toEqual(["consent", "update", { analytics_storage: "granted" }])
    expect(lock(SITE)).toBe(false)
    expect(sendToGoogleAnalytics(SITE, { name: "page_view", params: HOME })).toBe(true)
  })
})

describe("Google Analytics' cookies, taken out", () => {
  it("expires _ga and every _ga_<stream> on the host and on each parent domain, and no other cookie", () => {
    const cookies = "bl_site_consent=denied; _ga=GA1.1.1.2; _gat=1; _ga_TEST000000=GS1.1.3.4; bl_locale=pt-BR; _gab=1"

    expect(googleAnalyticsCookieExpiries(cookies, "www.beelink.example")).toEqual([
      "_ga=; Path=/; Max-Age=0",
      "_ga=; Domain=www.beelink.example; Path=/; Max-Age=0",
      "_ga=; Domain=beelink.example; Path=/; Max-Age=0",
      "_ga_TEST000000=; Path=/; Max-Age=0",
      "_ga_TEST000000=; Domain=www.beelink.example; Path=/; Max-Age=0",
      "_ga_TEST000000=; Domain=beelink.example; Path=/; Max-Age=0",
    ])
  })

  it("names no domain for a host with none above it, and writes nothing where there is nothing to take out", () => {
    expect(googleAnalyticsCookieExpiries("_ga=GA1.1.1.2", "localhost")).toEqual(["_ga=; Path=/; Max-Age=0"])
    expect(googleAnalyticsCookieExpiries("bl_site_consent=denied; bl_cart=x", "beelink.example")).toEqual([])
    expect(googleAnalyticsCookieExpiries("", "beelink.example")).toEqual([])
  })

  it("names each cookie once, however many domains the browser holds it on", () => {
    expect(googleAnalyticsCookieExpiries("_ga=GA1.1.1.2; _ga=GA1.2.9.9", "localhost")).toEqual(["_ga=; Path=/; Max-Age=0"])
  })

  it("takes them out of the browser and leaves the visitor's answer where it was", () => {
    document.cookie = "_ga=GA1.1.1.2; Path=/"
    document.cookie = "_ga_TEST000000=GS1.1.3.4; Path=/"
    document.cookie = "_ga_OLD1234567=GS1.1.5.6; Path=/"
    document.cookie = "bl_site_consent=denied; Path=/"

    forgetGoogleAnalyticsCookies()

    expect(document.cookie).toBe("bl_site_consent=denied")
  })
})

describe("the one file that names Google's tag", () => {
  it("loads the library from one fixed address with the ID as its only parameter, and builds no script text", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/google-analytics.ts"), "utf8")

    expect(googleAnalyticsSrc(SITE)).toBe("https://www.googletagmanager.com/gtag/js?id=G-TEST000000")
    expect(googleAnalyticsSrc("G-X&l=other")).toBe("https://www.googletagmanager.com/gtag/js?id=G-X%26l%3Dother")
    expect(source).not.toMatch(/dangerouslySetInnerHTML|innerHTML|createElement|eval\(|new Function/)
  })

  it("holds no measurement ID of its own: the caller hands it one", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/google-analytics.ts"), "utf8")

    expect(source).not.toMatch(/G-[A-Z0-9]{6,16}/)
  })
})
