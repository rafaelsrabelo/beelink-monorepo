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
  ])("shuts the library before the address changes, for %s", (_name, url) => {
    startGoogleAnalytics(ID, HOME)
    expect(window[LOCK]).toBe(false)

    onRouterTransitionStart(url)

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

    onRouterTransitionStart(url)

    expect(window[LOCK]).toBe(false)
  })

  it("does nothing in a tab that never loaded the library: no queue, no lock", () => {
    onRouterTransitionStart("/loja-de-exemplo")

    expect(window.dataLayer).toBeUndefined()
    expect(Object.keys(window).filter((key) => key.startsWith("ga-disable-"))).toEqual([])
  })
})
