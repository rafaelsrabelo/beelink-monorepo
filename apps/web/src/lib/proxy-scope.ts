// App
import { CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE } from "./customer-session-cookies"
import { isPanelPage } from "./panel-return"
import { REFRESH_COOKIE } from "./session-cookies"

/**
 * What the proxy takes in hand on the platform's host — and everything it does not is public, on
 * purpose (apps/web/AGENTS.md, rule 3).
 *
 * This list was the proxy's `matcher` until a shop could have a domain of its own (BEELINK-283). A
 * matcher is fixed at build time and cannot see the host, so the proxy is now called for every
 * request, and the list lives here as code: on the platform's host, a request this does not hand
 * over passes through untouched, exactly as when the matcher never called the proxy for it. That is
 * what keeps `/<slug>` anonymous and indexable — `proxy()` sends a visitor with no session to
 * `/login`, and would answer a crawler with a redirect for the whole public site.
 */

/** The signed-in pages that are handed over with everything under them. */
const PANEL_TREES = ["/dashboard", "/admin"]

/**
 * The paths handed over alone, with nothing under them: `/create-store` — signed in like the two
 * above, and on the API's reserved-slug list, so no shop can take it and turn a guarded path into a
 * storefront — and the screens a signed-in person has no business seeing.
 */
const PANEL_PAGES = ["/create-store", "/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]

/**
 * The panel's route handlers: under `/api`, save the groups that write their own cookies (`session`,
 * `auth`) or a shop's (`customer`, `storefront`).
 */
const PANEL_HANDLER = /^\/api\/(?!(?:session|auth|customer|storefront)(?:\/|$))[^/]+(?:\/.*)?$/

/**
 * A shop window, and the handlers under it: a first segment with no dot that does not start with
 * `_next` or `api`.
 *
 * "Does not start with", as the matcher's `(?!_next|api)` read: a shop whose slug begins with `api`
 * — `apiario` — is not handed over, and a shopper's expired session there is renewed by the shop's
 * handlers alone, never on a page. A known defect, kept as it was: this ticket changes nothing the
 * platform's host does.
 */
const SHOP_PATH = /^\/(?!_next|api)[^/.]+(?:\/.*)?$/

/**
 * Whether the proxy acts on a request to the platform's host:
 *
 * - the panel's pages and `/create-store`, and the auth screens — always;
 * - the panel's handlers — only with a panel refresh cookie, to renew the pair on the way;
 * - a shop's pages and handlers — only for a shopper whose refresh cookie is there and whose access
 *   cookie is not, to keep them signed in. An anonymous visitor and a crawler are never handed over.
 */
export function wasHandedOver(pathname: string, has: (cookie: string) => boolean): boolean {
  if (PANEL_TREES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true
  if (PANEL_PAGES.includes(pathname)) return true
  if (PANEL_HANDLER.test(pathname) && has(REFRESH_COOKIE)) return true

  return SHOP_PATH.test(pathname) && has(CUSTOMER_REFRESH_COOKIE) && !has(CUSTOMER_ACCESS_COOKIE)
}

/** Screens a signed-in person has no business seeing. */
const AUTH_PATHS = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/** The panel's own paths; everything else handed over is a shop window. */
export function isPanelPath(pathname: string): boolean {
  return isAuthPath(pathname) || isPanelPage(pathname)
}

/** A file, by its address: a last segment with an extension. Next serves those from the disk, or from a metadata route. */
export function isFilePath(pathname: string): boolean {
  return /\.[^/]+$/.test(pathname)
}

/**
 * The shop a page's address names on the platform's host — `/<slug>` and what is under it, with
 * `rest` the address less the slug — or null for what is no shop's page: the root, a file, a handler
 * (`/api/…`, `/<slug>/api/…`), the panel.
 */
export function shopPageOf(pathname: string): { slug: string; rest: string } | null {
  if (isFilePath(pathname) || isPanelPath(pathname)) return null

  const [, slug = "", second] = pathname.split("/")
  if (!/^[a-z0-9-]+$/.test(slug) || slug === "api" || second === "api") return null

  return { slug, rest: pathname.slice(slug.length + 1) || "/" }
}
