// Libs
import { afterEach, beforeEach, describe, expect, it } from "vitest"

// App
import { onRouterTransitionStart } from "./instrumentation-client"
import { sendToGoogleAnalytics, startGoogleAnalytics } from "@/lib/google-analytics"

const ID = "G-TEST000000"
const LOCK = `ga-disable-${ID}` as const
const HOME = { page_location: "http://localhost:3000/" }

beforeEach(() => {
  window.history.replaceState(null, "", "/")
})

afterEach(() => {
  delete window.dataLayer
  delete window[LOCK]
})

/**
 * BEELINK-320: Google's library stays in the tab and hears the address change. It is shut when a
 * navigation begins — which Next says before it changes the address — so the next page is never
 * told by a library left open.
 */
describe("the start of a navigation", () => {
  it.each([
    ["a shop's page", "/loja-de-exemplo"],
    ["another signed-out screen", "/forgot-password"],
    ["the panel", "/admin/loja-da-ana"],
    ["another measured page — it opens again on arriving", "/signup"],
    ["an address written whole", "http://localhost:3000/privacidade"],
    ["another site", "https://example.com/"],
    ["an address that cannot be read", "http://["],
  ])("shuts the library before the address changes, for %s", (_name, url) => {
    startGoogleAnalytics(ID, HOME)
    expect(window[LOCK]).toBe(false)

    onRouterTransitionStart(url, "push")

    expect(window[LOCK]).toBe(true)
    expect(sendToGoogleAnalytics(ID, { name: "page_view", params: HOME })).toBe(false)
  })

  it.each([
    ["an anchor of the page", "#planos"],
    ["the page with an anchor", "/#integracoes"],
    ["the page with a parameter", "/?utm_source=instagram"],
    ["the page's own address, whole", "http://localhost:3000/"],
  ])("leaves it open for %s: nothing was left", (_name, url) => {
    startGoogleAnalytics(ID, HOME)

    onRouterTransitionStart(url, "push")
    onRouterTransitionStart(url, "replace")

    expect(window[LOCK]).toBe(false)
  })

  // The browser has changed the address by the time Back or Forward is heard of: the page left is not the one in the bar.
  it("shuts it at Back and Forward wherever they lead, since the address has changed already", () => {
    startGoogleAnalytics(ID, HOME)

    onRouterTransitionStart("http://localhost:3000/", "traverse")

    expect(window[LOCK]).toBe(true)
  })

  it("does nothing in a tab that never loaded the library: no queue, no lock", () => {
    onRouterTransitionStart("/loja-de-exemplo", "push")
    onRouterTransitionStart("http://localhost:3000/loja-de-exemplo", "traverse")

    expect(window.dataLayer).toBeUndefined()
    expect(Object.keys(window).filter((key) => key.startsWith("ga-disable-"))).toEqual([])
  })
})
