// App
import { BACK_KEY } from "./storefront-routes"

/**
 * The coupon applied to the cart travels in the cart's own address, `?cupom=BEMVINDO10`
 * (BEELINK-194). It has to outlive the page: adding an address on the way to the order is a form
 * posted and a page loaded again, and a coupon that quietly went missing on the way back is an order
 * placed at a price the shopper did not mean to pay. The address is what carries it, and nothing is
 * kept in the browser — no cookie, which the privacy text would have to list.
 *
 * Whether the code is worth anything is the API's to say, on every read: the address holds a word
 * the shopper typed, never a discount.
 */
export const COUPON_KEY = "cupom"

/** As the API takes a code: 3 to 30 of these. Anything else in an address is not one. */
const COUPON = /^[A-Za-z0-9][A-Za-z0-9_-]{2,29}$/

/** Any origin: only the path, the query and the fragment are read back. */
const BASE = "http://shop.invalid"

/** The coupon an address names, or null. An address is anyone's to write: what is not a code is dropped. */
export function couponIn(raw: string | string[] | null | undefined): string | null {
  return typeof raw === "string" && COUPON.test(raw) ? raw : null
}

/** A path with its query, with the coupon put in — or taken out, with null. */
export function pathWithCoupon(path: string, coupon: string | null): string {
  const url = new URL(path, BASE)
  if (coupon) url.searchParams.set(COUPON_KEY, coupon)
  else url.searchParams.delete(COUPON_KEY)

  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * A link that leaves the cart and comes back to it — sign in, change details, add an address — made
 * to come back with the coupon. The way back is the link's `voltar`; one without it is left as it is.
 */
export function backWithCoupon(href: string, coupon: string | null): string {
  const url = new URL(href, BASE)
  const back = url.searchParams.get(BACK_KEY)
  if (!back) return href

  url.searchParams.set(BACK_KEY, pathWithCoupon(back, coupon))
  return `${url.pathname}${url.search}${url.hash}`
}

/** Every way out of the cart that comes back to it, each made to take the coupon along. */
export function waysBackWithCoupon<Ways extends Record<string, string>>(hrefs: Ways, coupon: string | null): Ways {
  return Object.fromEntries(Object.entries(hrefs).map(([name, href]) => [name, backWithCoupon(href, coupon)])) as Ways
}
