// Next
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// App
import { publicOriginOf } from "@/lib/bff"
import { CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE, clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { LEGAL_ROUTES } from "@/lib/legal-routes"
import { refreshCustomerSession } from "@/lib/refresh-customer-session"
import { panelReturnOf, RETURN_KEY, signInHrefOf } from "@/lib/panel-return"
import { isAuthPath, isFilePath, isPanelPath, shopPageOf, wasHandedOver } from "@/lib/proxy-scope"
import { refreshSession } from "@/lib/refresh-session"
import { serverEnv } from "@/lib/server-env"
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, setSessionCookies } from "@/lib/session-cookies"
import { SHOP_DOMAIN_HEADER, type ShopAddress } from "@/lib/shop-address"
import { hostNameOf, shopHosts } from "@/lib/shop-hosts"

/**
 * A shopper's e-mailed link — confirming the address, or setting a new password — names the shop it
 * came from (`voltar=/<slug>`). The account it acts on is that shop's, so a shopkeeper's session in
 * the same browser has no say in it: sent to the panel instead, the link would never be spent.
 */
function isShopperLink({ nextUrl }: NextRequest): boolean {
  return (
    (nextUrl.pathname === "/verify-email" || nextUrl.pathname === "/reset-password") &&
    /^\/[a-z0-9-]+$/.test(nextUrl.searchParams.get("voltar") ?? "")
  )
}

/** Where a signed-out visitor of a panel page goes: the sign-in, and back to this very page after. */
function signInFrom(request: NextRequest): URL {
  return new URL(signInHrefOf(request.nextUrl.pathname + request.nextUrl.search), request.url)
}

/** Where a signed-in visitor of the sign-in screen goes: the page it was asked to go back to, or the panel. */
function panelFrom(request: NextRequest): URL {
  return new URL(panelReturnOf(request.nextUrl.searchParams.get(RETURN_KEY)) ?? "/admin", request.url)
}

/**
 * Renewed this long before the access token runs out. A handler's new cookies reach the browser only
 * with its answer: renewing on a call that answers late — an upload — while another call still
 * carries the spent refresh past the API's 20 s grace would end the session as a stolen token.
 * Renewing ahead, on the ordinary calls of an open panel, makes a renewal on a late one rare.
 */
const RENEW_AHEAD_S = 180

/** Seconds left on an access token, read from its payload without checking it: only to time a renewal. */
function secondsLeftOf(token: string): number | null {
  try {
    const payload = token.split(".")[1] ?? ""
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown }
    return typeof exp === "number" ? exp - Date.now() / 1000 : null
  } catch {
    return null
  }
}

/**
 * The panel's route handlers, with a session whose access token is running out or ran out a quarter
 * of an hour into an open tab (BEELINK-169). It never redirects — a handler answers JSON. A refused
 * refresh clears the cookies, so the handler answers 401 and the page sends the person to sign in;
 * an API that did not answer is an outage, never a sign-out.
 */
async function keepPanelSignedIn(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  if (!refreshToken) return NextResponse.next()
  if (accessToken) {
    const left = secondsLeftOf(accessToken)
    // An upload answers late: it renews only a token already gone, never ahead.
    if (left === null || left > RENEW_AHEAD_S || request.nextUrl.pathname.startsWith("/api/uploads")) return NextResponse.next()
  }

  const outcome = await refreshSession(refreshToken, request.headers.get("x-forwarded-for"))
  if (outcome.status === "unavailable") {
    if (accessToken) return NextResponse.next()
    return NextResponse.json({ statusCode: 503, errorCode: "SERVICE_UNAVAILABLE", message: "The session could not be renewed" }, { status: 503 })
  }

  if (outcome.status === "rejected") {
    const answer = NextResponse.next()
    clearSessionCookies(answer.cookies)
    return answer
  }

  // Upstream too, so the handler of this very request calls the API with the new token.
  request.cookies.set(ACCESS_COOKIE, outcome.session.accessToken)
  request.cookies.set(REFRESH_COOKIE, outcome.session.refreshToken)
  const answer = NextResponse.next({ request: { headers: request.headers } })
  setSessionCookies(answer.cookies, outcome.session)
  return answer
}

/**
 * How a request goes on to its page or handler. `upstream` says the request's own headers changed —
 * a renewed pair in its cookies — and must travel with it.
 */
type Forward = (upstream: boolean) => NextResponse

/**
 * A shopper's session, kept alive on a shop's pages. A shop path gets here only when a shopper's
 * refresh cookie is there and the access cookie is not — this shop's, since both live on its path —
 * so an anonymous visitor and a crawler cost no call. It never redirects: the shop is public, signed
 * in or not, and a refusal only means the shopper browses signed out from here.
 */
async function keepShopperSignedIn(request: NextRequest, shop: ShopAddress, forward: Forward): Promise<NextResponse> {
  const refreshToken = request.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value

  if (!refreshToken || request.cookies.has(CUSTOMER_ACCESS_COOKIE) || !/^[a-z0-9-]+$/.test(shop.slug)) return forward(false)

  const outcome = await refreshCustomerSession(shop.slug, refreshToken, request.headers.get("x-forwarded-for"))

  if (outcome.status === "unavailable") return forward(false)

  if (outcome.status === "rejected") {
    const answer = forward(false)
    clearCustomerSessionCookies(answer, shop)
    return answer
  }

  // Upstream too, so the page rendering this request already knows who is signed in.
  request.cookies.set(CUSTOMER_ACCESS_COOKIE, outcome.session.accessToken)
  request.cookies.set(CUSTOMER_REFRESH_COOKIE, outcome.session.refreshToken)
  const answer = forward(true)
  setCustomerSessionCookies(answer, shop, outcome.session)
  return answer
}

/** The host the visitor addressed, as `publicOriginOf()` takes it, port and all. */
function hostAskedOf(request: NextRequest): string {
  return request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host
}

/**
 * The platform's own host, when the deployment names it: a request by it never asks the table of
 * shop hosts whose host it is. Unset — development, the e2e — every host is looked up.
 */
const PLATFORM_HOST = serverEnv.WEB_DOMAIN ? hostNameOf(serverEnv.WEB_DOMAIN) : null

/**
 * Where a shop's own domain is, as an origin to redirect to. Https and no port, always — but for a
 * request that arrived by a local host, where nothing terminates TLS and the port is the server's
 * own: development and the e2e go on by the request's scheme and port.
 */
function shopOriginOf(request: NextRequest, domain: string): string {
  const asked = hostAskedOf(request)
  const name = hostNameOf(asked)
  if (name !== "localhost" && !name.endsWith(".localhost") && name !== "127.0.0.1" && name !== "[::1]") return `https://${domain}`

  const port = /:(\d+)$/.exec(asked)?.[1]
  return `${request.nextUrl.protocol}//${domain}${port ? `:${port}` : ""}`
}

/**
 * A request that arrived by a shop's own, active domain (BEELINK-283). The shop's pages are at the
 * root there, so a page's address is rewritten onto `/<slug>`, where the routes are; and the request
 * goes on stamped with the shop's slug, which is what tells the page and the shop's handlers that
 * no address, redirect or cookie of theirs carries the slug (`lib/shop-address.ts`).
 *
 * What is not a page of the shop passes as it came: Next's own files, the platform's handlers under
 * `/api`, any file, and bee-link's terms and privacy policy, which the shop's footer and sign-up
 * link to — the API keeps both words from being a category's.
 */
async function onShopDomain(request: NextRequest, slug: string): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl
  if (pathname.startsWith("/_next/") || pathname === "/api" || pathname.startsWith("/api/")) return NextResponse.next()

  const shop = { slug, ownDomain: true } satisfies ShopAddress
  const under = `/${slug}`

  // The shop's handlers keep their address on every host: `/api/customer` and `/api/storefront`
  // are the platform's already.
  if (pathname === `${under}/api` || pathname.startsWith(`${under}/api/`)) {
    request.headers.set(SHOP_DOMAIN_HEADER, slug)
    return keepShopperSignedIn(request, shop, () => NextResponse.next({ request: { headers: request.headers } }))
  }

  if (isFilePath(pathname) || pathname === LEGAL_ROUTES.terms || pathname === LEGAL_ROUTES.privacy) return NextResponse.next()

  // One address a page: the slug in front of it is the platform's spelling, and leads to the same page.
  if (pathname === under || pathname.startsWith(`${under}/`)) {
    return NextResponse.redirect(`${publicOriginOf(request)}${pathname.slice(under.length) || "/"}${search}`, 308)
  }

  // From `nextUrl`, the server's own address: a rewrite is internal, and one to the visitor's origin
  // would be fetched from outside.
  const page = request.nextUrl.clone()
  page.pathname = pathname === "/" ? under : `${under}${pathname}`
  request.headers.set(SHOP_DOMAIN_HEADER, slug)
  return keepShopperSignedIn(request, shop, () => NextResponse.rewrite(page, { request: { headers: request.headers } }))
}

/**
 * A request to the platform's host, or to a host that is no shop's.
 *
 * An optimistic check, never the lock: it only looks at whether a cookie is there, so a signed-out
 * visitor lands on /login before a page renders. The API validates the bearer token on every call.
 *
 * It is also the only place that may refresh: it can store the new pair, which a Server Component
 * cannot.
 */
async function onPlatform(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // A shop with an active domain has one address: its pages here lead there, path and query kept,
  // which is what keeps a link already shared, or written into an e-mail, alive.
  const page = shopPageOf(pathname)
  const domain = page ? (await shopHosts()).hostOf(page.slug) : null
  if (page && domain) return NextResponse.redirect(`${shopOriginOf(request, domain)}${page.rest}${request.nextUrl.search}`, 308)

  // Everything else is public on purpose, and passes as it did when the matcher never called the
  // proxy for it: `lib/proxy-scope.ts`.
  if (!wasHandedOver(pathname, (cookie) => request.cookies.has(cookie))) return NextResponse.next()

  if (pathname.startsWith("/api/")) return keepPanelSignedIn(request)
  if (!isPanelPath(pathname)) {
    const slug = pathname.split("/")[1] ?? ""
    return keepShopperSignedIn(request, { slug }, (upstream) => (upstream ? NextResponse.next({ request: { headers: request.headers } }) : NextResponse.next()))
  }
  if (isShopperLink(request)) return NextResponse.next()

  const onAuthPath = isAuthPath(pathname)
  const hasAccess = request.cookies.has(ACCESS_COOKIE)
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

  if (!hasAccess && refreshToken) {
    const outcome = await refreshSession(refreshToken, request.headers.get("x-forwarded-for"))

    // The API being unreachable says nothing about the session: keep the cookies and let the page
    // deal with it, rather than signing everyone out during an outage.
    if (outcome.status === "unavailable") return NextResponse.next()

    if (outcome.status === "rejected") {
      const answer = onAuthPath ? NextResponse.next() : NextResponse.redirect(signInFrom(request))
      clearSessionCookies(answer.cookies)
      return answer
    }

    const { session } = outcome

    // The cookies go to the browser, and the header goes upstream so the page rendering THIS
    // request already sees the new token instead of rendering as signed out.
    request.cookies.set(ACCESS_COOKIE, session.accessToken)
    request.cookies.set(REFRESH_COOKIE, session.refreshToken)

    const answer = onAuthPath ? NextResponse.redirect(panelFrom(request)) : NextResponse.next({ request: { headers: request.headers } })
    setSessionCookies(answer.cookies, session)

    return answer
  }

  if (!hasAccess && !onAuthPath) return NextResponse.redirect(signInFrom(request))
  if (hasAccess && onAuthPath) return NextResponse.redirect(panelFrom(request))

  return NextResponse.next()
}

/**
 * Every request that can reach a page or a route handler passes here first, and is sorted by the
 * host it arrived by: a shop's own domain (BEELINK-283), or the platform's — where nothing changed.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Only this proxy writes the stamp, and what reads it trusts it. No browser sends one: a request
  // that arrives with it is claiming to have come by a shop's own domain.
  if (request.headers.has(SHOP_DOMAIN_HEADER)) {
    return NextResponse.json({ statusCode: 400, errorCode: "BAD_REQUEST", message: `${SHOP_DOMAIN_HEADER} is not a header a request may carry` }, { status: 400 })
  }

  const host = hostNameOf(hostAskedOf(request))
  if (host === PLATFORM_HOST) return onPlatform(request)

  const hosts = await shopHosts()
  const slug = hosts.slugOf(host)
  if (slug) return onShopDomain(request, slug)

  // `www.` in front of a shop's domain is the same shop, at its one address.
  if (host.startsWith("www.") && hosts.slugOf(host.slice(4))) {
    const bare = new URL(publicOriginOf(request))
    bare.hostname = host.slice(4)
    return NextResponse.redirect(`${bare.origin}${request.nextUrl.pathname}${request.nextUrl.search}`, 308)
  }

  return onPlatform(request)
}

export const config = {
  // Every request that can reach a page or a route handler, and so everything but Next's own build
  // files and its image optimizer, which run no code of this app. A matcher is fixed at build time
  // and cannot see the host, and a shop's own domain is told from the platform's by the host alone.
  //
  // It was an allow-list, and that list still decides what the proxy does on the platform's host:
  // `wasHandedOver()` in `lib/proxy-scope.ts`. Every path it does not name is public on purpose —
  // `/<slug>` is a storefront, anonymous and meant to be indexed, and the rule "no session cookie,
  // go to /login" would answer a crawler with a redirect for the whole public site. Dropping that
  // call is the one edit that breaks bee-link silently.
  //
  // A file with an extension is matched too, and let through inside: a dynamic segment takes a dot,
  // so `/<slug>/produtos/a.b` reaches a page's code — and whatever reaches code must have passed the
  // refusal of a forged stamp above.
  matcher: ["/((?!_next/static|_next/image).*)"],
}
