// Node
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Libs
import { afterEach, describe, expect, it } from "vitest"

// App
import { leaveMetaPixel, META_PIXEL_SRC, sendToMetaPixel, startMetaPixel, stopMetaPixel } from "./meta-pixel"

const SHOP_A = "123456789012345"
const SHOP_B = "999888777666555"
const PAGE_VIEW = { name: "PageView", params: {} }

/** What the library would find waiting: with none loaded, every call stays in Meta's queue, in order. */
const calls = () => (window.fbq?.queue ?? []).map((call) => [...call])

/** The library arrives: it takes what waited, and answers every call from then on. */
function arrive(): unknown[][] {
  const heard: unknown[][] = window.fbq!.queue.splice(0).map((call) => [...call])
  window.fbq!.callMethod = (...args) => void heard.push(args)
  return heard
}

afterEach(() => {
  delete window.fbq
  delete window._fbq
})

describe("Meta's pixel library, as the shop window drives it", () => {
  it("creates nothing until it is started: no fbq at all", () => {
    stopMetaPixel()

    expect(window.fbq).toBeUndefined()
    expect(window._fbq).toBeUndefined()
  })

  it("starts a pixel as Meta's base code does, with automatic collection off before init", () => {
    startMetaPixel(SHOP_A)

    expect(calls()).toEqual([
      ["set", "autoConfig", false, SHOP_A],
      ["init", SHOP_A],
      ["set", "trackSingleOnly", true, SHOP_A],
    ])
    expect(window.fbq?.loaded).toBe(true)
    expect(window.fbq?.version).toBe("2.0")
    expect(window._fbq).toBe(window.fbq)
  })

  it("gives init the id alone: nothing of the visitor's for matching", () => {
    startMetaPixel(SHOP_A)

    expect(calls().find(([command]) => command === "init")).toEqual(["init", SHOP_A])
  })

  it("turns off the library's own page view at every pushState, which would go to every pixel in the tab", () => {
    startMetaPixel(SHOP_A)

    expect(window.fbq?.disablePushState).toBe(true)
  })

  it("starts a pixel once per id, however often it is asked", () => {
    startMetaPixel(SHOP_A)
    startMetaPixel(SHOP_A)
    sendToMetaPixel(SHOP_A, PAGE_VIEW, "e-1")
    startMetaPixel(SHOP_B)
    startMetaPixel(SHOP_B)

    expect(calls().filter(([command]) => command === "init")).toEqual([
      ["init", SHOP_A],
      ["init", SHOP_B],
    ])
  })

  it("addresses every event to one pixel, with its parameters and its event id", () => {
    sendToMetaPixel(SHOP_A, { name: "AddToCart", params: { content_ids: ["p-1"], value: 12.5, currency: "BRL" } }, "e-7")

    expect(calls().at(-1)).toEqual(["trackSingle", SHOP_A, "AddToCart", { content_ids: ["p-1"], value: 12.5, currency: "BRL" }, { eventID: "e-7" }])
  })

  it("never sends to the pixels on the page: no bare track, whatever is sent and to however many shops", () => {
    sendToMetaPixel(SHOP_A, PAGE_VIEW, "e-1")
    sendToMetaPixel(SHOP_B, PAGE_VIEW, "e-2")

    expect(calls().map(([command]) => command)).not.toContain("track")
    expect(calls().filter(([command]) => command === "trackSingle").map(([, pixelId]) => pixelId)).toEqual([SHOP_A, SHOP_B])
  })

  it("revokes the library's consent when stopped, once, and grants it again before the next event", () => {
    startMetaPixel(SHOP_A)
    const heard = arrive()

    stopMetaPixel()
    stopMetaPixel()
    sendToMetaPixel(SHOP_A, PAGE_VIEW, "e-1")

    expect(heard.slice(3)).toEqual([
      ["consent", "revoke"],
      ["consent", "grant"],
      ["trackSingle", SHOP_A, "PageView", {}, { eventID: "e-1" }],
    ])
  })

  it("stopped before the library arrived, leaves it shut on arrival and takes back what had not left yet", () => {
    sendToMetaPixel(SHOP_A, PAGE_VIEW, "e-1")
    stopMetaPixel()

    expect(calls().at(-1)).toEqual(["consent", "revoke"])
    expect(calls().map(([command]) => command)).not.toContain("trackSingle")
  })

  // The library stops reading its queue at a revoke: a grant queued behind one would never be reached.
  it("never leaves a grant waiting behind a revoke: a yes given again before the library arrived takes the revoke out", () => {
    startMetaPixel(SHOP_A)
    stopMetaPixel()
    sendToMetaPixel(SHOP_A, PAGE_VIEW, "e-2")

    expect(calls().map(([command]) => command)).toEqual(["set", "init", "set", "trackSingle"])
  })

  it("is shut once a shop's pages are left for good", async () => {
    startMetaPixel(SHOP_A)
    const heard = arrive()

    leaveMetaPixel()
    expect(heard).toHaveLength(3)
    await Promise.resolve()

    expect(heard.at(-1)).toEqual(["consent", "revoke"])
  })

  it("stays open when the pages left are followed at once by a shop's that say yes — the next shop, or the same pages mounted again", async () => {
    startMetaPixel(SHOP_A)
    const heard = arrive()

    leaveMetaPixel()
    startMetaPixel(SHOP_B)
    await Promise.resolve()

    expect(heard.map(([command]) => command)).not.toContain("consent")
  })

  it("hands a call to the library once it has arrived", () => {
    startMetaPixel(SHOP_A)
    const heard: unknown[][] = []
    window.fbq!.callMethod = (...args) => void heard.push(args)

    sendToMetaPixel(SHOP_A, PAGE_VIEW, "e-1")

    expect(heard).toEqual([["trackSingle", SHOP_A, "PageView", {}, { eventID: "e-1" }]])
  })

  it("loads the library from one fixed address, and builds no script text from a shop's id", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/meta-pixel.ts"), "utf8")

    expect(META_PIXEL_SRC).toBe("https://connect.facebook.net/en_US/fbevents.js")
    expect(source).not.toMatch(/dangerouslySetInnerHTML|innerHTML|createElement|eval\(|new Function/)
  })
})
