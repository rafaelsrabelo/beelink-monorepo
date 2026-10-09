/**
 * Where a shop's pages are, on the request at hand (BEELINK-283): under `/<slug>` on the platform's
 * host, or at the root of the shop's own domain, where the whole site is the shop's.
 *
 * Which of the two is decided once per request, by `src/proxy.ts`, from the table of hosts — and
 * everything that spells an address, a redirect or a cookie's path follows that one answer, so a
 * page never disagrees with the route that served it.
 */
export interface ShopAddress {
  slug: string
  /** The request arrived by the shop's own domain. Absent, it arrived by the platform's host. */
  ownDomain?: boolean
}

/**
 * The request header the proxy stamps a request with when it arrived by a shop's own domain: that
 * shop's slug. Only the proxy writes it — a request that arrives carrying one is refused there —
 * and it never goes on a response.
 */
export const SHOP_DOMAIN_HEADER = "x-bl-shop-domain"

/**
 * The shop as this request reached it. The stamp counts only for the shop it names: at one shop's
 * domain no other shop is at the root.
 */
export function shopAddressOf(headers: Pick<Headers, "get">, slug: string): ShopAddress {
  return { slug, ownDomain: headers.get(SHOP_DOMAIN_HEADER) === slug }
}

/** What every page address of the shop starts with: `/<slug>`, or nothing at its own domain. */
export function shopBaseOf({ slug, ownDomain }: ShopAddress): string {
  return ownDomain ? "" : `/${slug}`
}

/**
 * The shop's front door: `/<slug>`, or `/` at its own domain — never the empty string. It is also
 * the path of every cookie the shop keeps: at its own domain a page sits at `/produtos`, where a
 * cookie on `/<slug>` is never sent.
 */
export function shopHomeOf(shop: ShopAddress): string {
  return shopBaseOf(shop) || "/"
}

/**
 * A page's address as the platform's host spells it, for what is told to the API: it writes a
 * shopper's e-mails with the platform's address, and keeps a place to return to only when it is
 * under `/<slug>`. At the platform's host the address already is one.
 */
export function platformPathOf(shop: ShopAddress, path: string): string {
  if (!shop.ownDomain) return path

  return `/${shop.slug}${path === "/" ? "" : path.startsWith("/?") || path.startsWith("/#") ? path.slice(1) : path}`
}
