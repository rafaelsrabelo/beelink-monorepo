// Libs
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import { COUNTED_FUNNEL_STEPS, createFunnelCounter, funnelCountedAt, funnelPathOf, funnelStepOf, sendFunnelStep } from "./funnel-count"
import type { StorefrontEvent } from "./storefront-event"
import { createTrack } from "./storefront-track"

const PIXEL = "123456789012345"
const QUIET = ["/loja/redefinir-senha"]
const HAZE: StorefrontEvent = { name: "ViewContent", product: { id: "p-1", name: "Haze", priceCents: 12990, category: null } }
const ADD: StorefrontEvent = { name: "AddToCart", item: { productId: "p-1", name: "Haze", unitPriceCents: 12990, qty: 1 } }
const CHECKOUT: StorefrontEvent = { name: "InitiateCheckout", items: [{ productId: "p-1", unitPriceCents: 12990, qty: 1 }], valueCents: 12990 }

const at = (pathname: string) => window.history.replaceState(null, "", pathname)
const metaSent = () => (window.fbq?.queue ?? []).filter(([command]) => command === "trackSingle").map(([, , name]) => name)

beforeEach(() => at("/loja"))

afterEach(() => {
  delete window.fbq
  delete window._fbq
  vi.unstubAllGlobals()
})

describe("which step of the funnel an event is", () => {
  it("maps the four moments the shop window counts", () => {
    expect([{ name: "PageView" } as const, HAZE, ADD, CHECKOUT].map(funnelStepOf)).toEqual(["PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART", "CHECKOUT_START"])
    expect(COUNTED_FUNNEL_STEPS).toEqual(["PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART", "CHECKOUT_START"])
  })

  it("counts no search, like or way of paying — and never a purchase, which is the shop's orders", () => {
    const none: StorefrontEvent[] = [
      { name: "Search", term: "whey" },
      { name: "AddToWishlist", product: { id: "p-1" } },
      { name: "AddPaymentInfo", items: [], valueCents: 0 },
      { name: "Purchase", items: [], valueCents: 12990 },
    ]

    expect(none.map(funnelStepOf)).toEqual([null, null, null, null])
  })
})

describe("the shop's own counter", () => {
  it("counts the page before what happens on it, and once per path however often it is told", () => {
    const steps: string[] = []
    const count = createFunnelCounter((step) => steps.push(step))

    count(HAZE, "/loja/produto/haze")
    count({ name: "PageView" }, "/loja/produto/haze")
    count({ name: "PageView" }, "/loja/produto/haze")
    expect(steps).toEqual(["PAGE_VIEW", "PRODUCT_VIEW"])

    count({ name: "PageView" }, "/loja/produtos")
    expect(steps).toEqual(["PAGE_VIEW", "PRODUCT_VIEW", "PAGE_VIEW"])
  })

  it("counts a product seen and a checkout begun once per page, and each addition to the cart", () => {
    const steps: string[] = []
    const count = createFunnelCounter((step) => steps.push(step))

    // Told twice: an effect run twice, a yes to cookies given on the page.
    count(HAZE, "/loja/produto/haze")
    count(HAZE, "/loja/produto/haze")
    count(ADD, "/loja/produto/haze")
    count(ADD, "/loja/produto/haze")
    count(CHECKOUT, "/loja/carrinho")
    count(CHECKOUT, "/loja/carrinho")

    expect(steps).toEqual(["PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART", "ADD_TO_CART", "PAGE_VIEW", "CHECKOUT_START"])
  })

  it("counts a product again when the visitor comes back to its page", () => {
    const steps: string[] = []
    const count = createFunnelCounter((step) => steps.push(step))

    count(HAZE, "/loja/produto/haze")
    count({ name: "PageView" }, "/loja")
    count(HAZE, "/loja/produto/haze")

    expect(steps.filter((step) => step === "PRODUCT_VIEW")).toHaveLength(2)
  })

  it("counts the page of an event that is no step, and nothing for the event", () => {
    const steps: string[] = []
    createFunnelCounter((step) => steps.push(step))({ name: "Search", term: "whey" }, "/loja/busca")

    expect(steps).toEqual(["PAGE_VIEW"])
  })

  it("never throws, whatever sending does", () => {
    const count = createFunnelCounter(() => {
      throw new Error("no network")
    })

    expect(() => count(ADD, "/loja")).not.toThrow()
  })
})

describe("the dispatch's second destination", () => {
  const counted = () => {
    const steps: string[] = []
    return { steps, count: createFunnelCounter((step) => steps.push(step)) }
  }

  it.each([
    ["a shop with no pixel", { pixelId: null, allowed: false }],
    ["a visitor who has not answered, or refused", { pixelId: PIXEL, allowed: false }],
    ["a visitor who said yes", { pixelId: PIXEL, allowed: true }],
  ])("counts for %s", (_who, shop) => {
    const { steps, count } = counted()
    const track = createTrack({ ...shop, quietPaths: QUIET, count })

    track(HAZE)
    track(ADD)

    expect(steps).toEqual(["PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART"])
  })

  it("creates nothing of Meta's by counting: without a yes the pixel is told nothing, and the answer is still no", () => {
    const { count } = counted()

    expect(createTrack({ pixelId: PIXEL, allowed: false, quietPaths: QUIET, count })(ADD)).toBe(false)
    expect(createTrack({ pixelId: null, allowed: true, quietPaths: QUIET, count })(ADD)).toBe(false)
    expect(window.fbq).toBeUndefined()
  })

  it("tells the pixel exactly what it told without a counter, and answers the pixel's yes", () => {
    const { steps, count } = counted()
    const track = createTrack({ pixelId: PIXEL, allowed: true, quietPaths: QUIET, count })

    expect(track(HAZE)).toBe(true)
    track({ name: "PageView" })
    track({ name: "Search", term: "whey" })

    expect(metaSent()).toEqual(["PageView", "ViewContent", "Search"])
    expect(steps).toEqual(["PAGE_VIEW", "PRODUCT_VIEW"])
  })

  it("counts nothing from a page whose address carries a token, with or without a yes", () => {
    const { steps, count } = counted()
    at("/loja/redefinir-senha")

    createTrack({ pixelId: PIXEL, allowed: true, quietPaths: QUIET, count })({ name: "PageView" })
    createTrack({ pixelId: null, allowed: false, quietPaths: QUIET, count })({ name: "PageView" })

    expect(steps).toEqual([])
  })

  it("keeps its count across a change of answer: the dispatch is made anew, the counter is not", () => {
    const { steps, count } = counted()

    createTrack({ pixelId: PIXEL, allowed: false, quietPaths: QUIET, count })(HAZE)
    // The yes, given on the page: where the visitor is gets told again — to the pixel.
    createTrack({ pixelId: PIXEL, allowed: true, quietPaths: QUIET, count })(HAZE)

    expect(steps).toEqual(["PAGE_VIEW", "PRODUCT_VIEW"])
    expect(metaSent()).toEqual(["PageView", "ViewContent"])
  })

  it("never counts a purchase, told to the pixel or not", () => {
    const { steps, count } = counted()

    createTrack({ pixelId: PIXEL, allowed: true, quietPaths: QUIET, count })({ name: "Purchase", items: [], valueCents: 12990 }, { id: "purchase-1" })

    expect(steps).toEqual(["PAGE_VIEW"])
  })
})

describe("sending a step", () => {
  it("posts the step's name to the shop's own route, with no cookie, outliving the page, waiting for nothing", () => {
    const fetched = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)

    expect(sendFunnelStep("loja", "ADD_TO_CART")).toBeUndefined()

    expect(fetched).toHaveBeenCalledTimes(1)
    const [url, init] = fetched.mock.calls[0]!
    expect(url).toBe("/loja/api/funnel")
    expect(init).toEqual({ method: "POST", headers: { "content-type": "application/json" }, body: '{"step":"ADD_TO_CART"}', keepalive: true, credentials: "omit", cache: "no-store" })
  })

  it("says nothing of the visitor or the page: the body is the step alone", () => {
    const fetched = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetched)
    document.cookie = "bl_cart=abc; Path=/"
    at("/loja/produto/haze")

    sendFunnelStep("loja", "PRODUCT_VIEW")

    expect(Object.keys(JSON.parse(String(fetched.mock.calls[0]![1]?.body)))).toEqual(["step"])
    document.cookie = "bl_cart=; Path=/; Max-Age=0"
  })

  it("drops a failure — a refusal, a network down, no fetch at all — and never throws or rejects", async () => {
    const rejected = vi.fn(() => undefined)
    process.on("unhandledRejection", rejected)

    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
    expect(() => sendFunnelStep("loja", "PAGE_VIEW")).not.toThrow()
    vi.stubGlobal("fetch", () => {
      throw new Error("blocked")
    })
    expect(() => sendFunnelStep("loja", "PAGE_VIEW")).not.toThrow()
    vi.stubGlobal("fetch", undefined)
    expect(() => sendFunnelStep("loja", "PAGE_VIEW")).not.toThrow()

    await new Promise((resolve) => setTimeout(resolve, 10))
    process.off("unhandledRejection", rejected)
    expect(rejected).not.toHaveBeenCalled()
  })

  it("spells the route under the shop's path", () => {
    expect(funnelPathOf("loja-do-pixel")).toBe("/loja-do-pixel/api/funnel")
  })
})

describe("where a funnel is counted", () => {
  it("is at a shop that sells, for a browser with no panel session", () => {
    expect(funnelCountedAt({ slug: "loja", type: "ECOMMERCE" }, false)).toBe("loja")
  })

  it("is nowhere for a site that sells nothing, a shopkeeper's browser, or no shop at all", () => {
    expect(funnelCountedAt({ slug: "site", type: "INSTITUTIONAL" }, false)).toBeNull()
    expect(funnelCountedAt({ slug: "loja", type: "ECOMMERCE" }, true)).toBeNull()
    expect(funnelCountedAt(null, false)).toBeNull()
  })
})
