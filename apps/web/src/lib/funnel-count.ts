// App
import type { StorefrontEvent } from "./storefront-event"

// Types
import type { CountedFunnelStep, PublicStore } from "@harness-monorepo/contracts"

/** The steps a shop window counts — the only words its counting route takes. */
export const COUNTED_FUNNEL_STEPS = ["PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART", "CHECKOUT_START"] as const satisfies readonly CountedFunnelStep[]

/**
 * Which step of the shop's funnel an event is (BEELINK-276); null for one that is none. A search, a
 * like and a way of paying picked are no step — and neither is a purchase: the funnel's last step
 * is the shop's orders, read where they are kept, never a browser's word.
 */
export function funnelStepOf(event: StorefrontEvent): CountedFunnelStep | null {
  switch (event.name) {
    case "PageView":
      return "PAGE_VIEW"
    case "ViewContent":
      return "PRODUCT_VIEW"
    case "AddToCart":
      return "ADD_TO_CART"
    case "InitiateCheckout":
      return "CHECKOUT_START"
    default:
      return null
  }
}

/** What is seen rather than done: counted once while the visitor stays on the page. An addition to the cart counts each time. */
const SEEN_ONCE: ReadonlySet<CountedFunnelStep> = new Set(["PAGE_VIEW", "PRODUCT_VIEW", "CHECKOUT_START"])

/** The shop's own count of an event: the second place `createTrack` tells. Never throws. */
export type FunnelCount = (event: StorefrontEvent, pathname: string) => void

/**
 * Counts a shop's funnel at the moments its pixel is told of them, whatever the visitor answered
 * about cookies — it holds nothing of the visitor, only which steps this page already counted.
 *
 * A page is a path, counted before anything that happens on it and once; a product seen and a
 * checkout begun count once per page too. That memory is what makes a view told again — a yes to
 * cookies given on the page, an effect run twice — count once here, and it is why this lives
 * outside `createTrack`, which is made anew whenever the answer changes.
 */
export function createFunnelCounter(send: (step: CountedFunnelStep) => void): FunnelCount {
  let page: string | null = null
  let seen = new Set<CountedFunnelStep>()

  const count = (step: CountedFunnelStep) => {
    if (SEEN_ONCE.has(step)) {
      if (seen.has(step)) return
      seen.add(step)
    }
    send(step)
  }

  return (event, pathname) => {
    try {
      if (page !== pathname) {
        page = pathname
        seen = new Set()
        count("PAGE_VIEW")
      }
      const step = funnelStepOf(event)
      if (step) count(step)
    } catch {
      // A count that could not be made is a count lost, and nothing the page should notice.
    }
  }
}

/**
 * Where a shop's funnel is counted: its slug, or null where nothing is. A site that sells nothing
 * has no cart and no orders, so no funnel; and a browser holding a panel session is a shopkeeper
 * looking at a shop, not a visit. That is "a panel is open in this browser", not "this shop's
 * owner" — telling them apart would cost a call to the API on every page of every shop.
 */
export function funnelCountedAt(store: Pick<PublicStore, "slug" | "type"> | null, panelSession: boolean): string | null {
  return store?.type === "ECOMMERCE" && !panelSession ? store.slug : null
}

/** The shop's counting route: under its own path, like everything a visitor's browser asks of a shop. */
export function funnelPathOf(slug: string): string {
  return `/${encodeURIComponent(slug)}/api/funnel`
}

/**
 * Tells the shop's counting route one step, and waits for nothing. The body is the step's name and
 * that is all that leaves: `credentials: "omit"` keeps every cookie the browser holds out of the
 * request — which is why this is `fetch` and not `sendBeacon`, which always sends them. `keepalive`
 * lets it outlive the page, since most steps are followed by a navigation. A failure is dropped:
 * the shop never shows, or waits for, a count.
 */
export function sendFunnelStep(slug: string, step: CountedFunnelStep): void {
  try {
    void fetch(funnelPathOf(slug), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ step }),
      keepalive: true,
      credentials: "omit",
      cache: "no-store",
    }).catch(() => undefined)
  } catch {
    // No `fetch`, or a browser that refuses the request outright: the same as a count lost.
  }
}
