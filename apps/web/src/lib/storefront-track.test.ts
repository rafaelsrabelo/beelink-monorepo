// Libs
import { afterEach, beforeEach, describe, expect, it } from "vitest"

// App
import { isQuietPath, quietPathsOf } from "./storefront-event"
import { createTrack } from "./storefront-track"

const PIXEL = "123456789012345"
const QUIET = ["/loja/confirmar-email", "/loja/redefinir-senha"]

const sent = () => (window.fbq?.queue ?? []).filter(([command]) => command === "trackSingle").map((call) => [...call])

beforeEach(() => {
  window.history.replaceState(null, "", "/loja")
})

afterEach(() => {
  delete window.fbq
  delete window._fbq
})

describe("the storefront's one point of dispatch", () => {
  it("sends nothing, and creates nothing of Meta's, for a visitor who has not said yes", () => {
    createTrack({ pixelId: PIXEL, allowed: false, quietPaths: QUIET })({ name: "PageView" })

    expect(window.fbq).toBeUndefined()
  })

  it("sends nothing for a shop with no pixel", () => {
    createTrack({ pixelId: null, allowed: true, quietPaths: QUIET })({ name: "PageView" })

    expect(window.fbq).toBeUndefined()
  })

  it("sends an allowed event to the shop's pixel, in Meta's words, with an id of its own", () => {
    const track = createTrack({ pixelId: PIXEL, allowed: true, quietPaths: QUIET })

    track({ name: "Search", term: "whey" })
    track({ name: "Search", term: "whey" })

    const [, first, second] = sent()
    expect(first?.slice(0, 4)).toEqual(["trackSingle", PIXEL, "Search", { search_string: "whey" }])
    const ids = [first, second].map((call) => (call?.[4] as { eventID: string }).eventID)
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/)
    expect(ids[1]).not.toBe(ids[0])
  })

  it("keeps the id it is given, which is how an order's purchase is told once from two places", () => {
    createTrack({ pixelId: PIXEL, allowed: true, quietPaths: QUIET })({ name: "Search", term: "whey" }, { id: "purchase-01a0d395" })

    expect(sent().at(-1)?.[4]).toEqual({ eventID: "purchase-01a0d395" })
  })

  it("tells the page before anything that happens on it, and once per path however it is asked", () => {
    const track = createTrack({ pixelId: PIXEL, allowed: true, quietPaths: QUIET })
    const names = () => sent().map(([, , name]) => name)

    // What is on the page speaks first, as a page's effects may run in any order.
    track({ name: "Search", term: "whey" })
    track({ name: "PageView" })
    track({ name: "PageView" })
    expect(names()).toEqual(["PageView", "Search"])

    window.history.pushState(null, "", "/loja/produtos")
    track({ name: "PageView" })
    track({ name: "Search", term: "creatina" })
    expect(names()).toEqual(["PageView", "Search", "PageView", "Search"])

    // The same path under another query is the same page.
    window.history.replaceState(null, "", "/loja/produtos?pagina=2")
    track({ name: "PageView" })
    expect(names()).toHaveLength(4)
  })

  it("tells nothing from a page whose address carries a token", () => {
    const track = createTrack({ pixelId: PIXEL, allowed: true, quietPaths: QUIET })

    window.history.replaceState(null, "", "/loja/redefinir-senha?token=secret")
    track({ name: "PageView" })
    expect(window.fbq).toBeUndefined()

    window.history.replaceState(null, "", "/loja/produtos")
    track({ name: "PageView" })
    expect(sent()).toHaveLength(1)
  })
})

describe("the shop's quiet pages", () => {
  it("are the ones its e-mailed links open, in the shop's own words", () => {
    expect(quietPathsOf({ slug: "loja", routeWords: { verifyEmail: "confirmar-email", resetPassword: "redefinir-senha" } as never })).toEqual(QUIET)
  })

  it("are none for a shop whose words name neither", () => {
    expect(quietPathsOf({ slug: "loja", routeWords: {} as never })).toEqual([])
  })

  it("match the page and what is under it, never a page that only starts the same", () => {
    expect(isQuietPath("/loja/redefinir-senha", QUIET)).toBe(true)
    expect(isQuietPath("/loja/redefinir-senha/x", QUIET)).toBe(true)
    expect(isQuietPath("/loja/redefinir-senha-nova", QUIET)).toBe(false)
    expect(isQuietPath("/loja", QUIET)).toBe(false)
  })
})
